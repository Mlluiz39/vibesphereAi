import { MetaCloudProvider } from '../src/providers/meta-cloud.provider';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const CREDS = {
  phoneNumberId: '123456',
  accessToken: 'test-access-token',
  appSecret: 'test-app-secret',
  verifyToken: 'my-verify-token',
};

describe('MetaCloudProvider', () => {
  let provider: MetaCloudProvider;

  beforeEach(() => {
    provider = new MetaCloudProvider(CREDS);
    mockFetch.mockReset();
  });

  describe('sendText', () => {
    it('should send a text message successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ messages: [{ id: 'wamid.abc123' }] }),
      });

      const result = await provider.sendText({ to: '5511999999999', text: 'Hello!' });

      expect(result.providerMessageId).toBe('wamid.abc123');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/v20.0/123456/messages');
      expect(options.method).toBe('POST');
      expect(options.headers).toMatchObject({
        Authorization: 'Bearer test-access-token',
        'Content-Type': 'application/json',
      });
      const body = JSON.parse(options.body);
      expect(body).toMatchObject({
        messaging_product: 'whatsapp',
        to: '5511999999999',
        type: 'text',
        text: { body: 'Hello!' },
      });
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(
        provider.sendText({ to: '123', text: 'test' }),
      ).rejects.toThrow('Falha ao enviar mensagem WhatsApp (401)');
    });

    it('should handle response without messages array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const result = await provider.sendText({ to: '123', text: 'test' });
      expect(result.providerMessageId).toBe('');
    });
  });

  describe('verifySignature', () => {
    it('should return true when no appSecret is configured', () => {
      const noSecretProvider = new MetaCloudProvider({
        phoneNumberId: '123',
        accessToken: 'token',
      });
      expect(noSecretProvider.verifySignature('body', 'sha256=abc')).toBe(true);
    });

    it('should return true for valid signature', () => {
      const { createHmac } = require('node:crypto');
      const body = '{"event":"message"}';
      const expected = createHmac('sha256', CREDS.appSecret)
        .update(body)
        .digest('hex');

      expect(provider.verifySignature(body, `sha256=${expected}`)).toBe(true);
    });

    it('should return false for invalid signature', () => {
      expect(provider.verifySignature('body', 'sha256=invalidhash')).toBe(false);
    });

    it('should return false when signature header is missing sha256= prefix', () => {
      expect(provider.verifySignature('body', 'invalidformat')).toBe(false);
    });

    it('should return false when signature header is undefined', () => {
      expect(provider.verifySignature('body', undefined)).toBe(false);
    });

    it('should return false when signature header is empty string', () => {
      expect(provider.verifySignature('body', '')).toBe(false);
    });
  });

  describe('verifyChallenge', () => {
    it('should return challenge on valid subscribe mode', () => {
      const result = provider.verifyChallenge({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'my-verify-token',
        'hub.challenge': 'challenge-123',
      });
      expect(result).toBe('challenge-123');
    });

    it('should return empty string when challenge is missing', () => {
      const result = provider.verifyChallenge({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'my-verify-token',
      });
      expect(result).toBe('');
    });

    it('should return null on wrong verify_token', () => {
      const result = provider.verifyChallenge({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': '123',
      });
      expect(result).toBeNull();
    });

    it('should return null on wrong mode', () => {
      const result = provider.verifyChallenge({
        'hub.mode': 'unsubscribe',
        'hub.verify_token': 'my-verify-token',
        'hub.challenge': '123',
      });
      expect(result).toBeNull();
    });
  });

  describe('parseInbound', () => {
    it('should parse text messages from webhook payload', () => {
      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  contacts: [{ wa_id: '5511999999999', profile: { name: 'João' } }],
                  messages: [
                    {
                      from: '5511999999999',
                      id: 'wamid.msg1',
                      type: 'text',
                      timestamp: '1234567890',
                      text: { body: 'Olá!' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const messages = provider.parseInbound(payload);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        from: '5511999999999',
        text: 'Olá!',
        providerMessageId: 'wamid.msg1',
        contactName: 'João',
        timestamp: 1234567890,
      });
    });

    it('should skip non-text messages', () => {
      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    { from: '123', id: 'm1', type: 'image', timestamp: '100' },
                    { from: '123', id: 'm2', type: 'text', text: { body: 'hi' } },
                  ],
                },
              },
            ],
          },
        ],
      };

      const messages = provider.parseInbound(payload);
      expect(messages).toHaveLength(1);
      expect(messages[0].providerMessageId).toBe('m2');
    });

    it('should skip messages without text body', () => {
      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [{ from: '123', id: 'm1', type: 'text' }],
                },
              },
            ],
          },
        ],
      };

      const messages = provider.parseInbound(payload);
      expect(messages).toHaveLength(0);
    });

    it('should handle empty payload', () => {
      expect(provider.parseInbound({})).toEqual([]);
      expect(provider.parseInbound(null)).toEqual([]);
    });

    it('should handle payload with no contacts', () => {
      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    { from: '123', id: 'm1', type: 'text', text: { body: 'hi' } },
                  ],
                },
              },
            ],
          },
        ],
      };

      const messages = provider.parseInbound(payload);
      expect(messages).toHaveLength(1);
      expect(messages[0].contactName).toBeUndefined();
    });

    it('should handle multiple entries and changes', () => {
      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    { from: '111', id: 'm1', type: 'text', text: { body: 'msg1' } },
                  ],
                },
              },
              {
                value: {
                  messages: [
                    { from: '222', id: 'm2', type: 'text', text: { body: 'msg2' } },
                  ],
                },
              },
            ],
          },
        ],
      };

      const messages = provider.parseInbound(payload);
      expect(messages).toHaveLength(2);
    });
  });
});
