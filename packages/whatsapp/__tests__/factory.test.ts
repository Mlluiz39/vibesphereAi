jest.mock('../src/providers/meta-cloud.provider', () => ({
  MetaCloudProvider: jest.fn().mockImplementation((creds) => ({
    name: 'meta_cloud',
    sendText: jest.fn().mockResolvedValue({ providerMessageId: 'msg-123' }),
    verifySignature: jest.fn().mockReturnValue(true),
    parseInbound: jest.fn().mockReturnValue([]),
    verifyChallenge: jest.fn().mockReturnValue('challenge'),
    creds,
  })),
}));

import { WhatsAppProviderFactory } from '../src/factory';
import { WhatsAppProviderKind } from '@vibesphere/shared';

describe('WhatsAppProviderFactory', () => {
  it('should create a Meta Cloud provider', () => {
    const provider = WhatsAppProviderFactory.create({
      kind: WhatsAppProviderKind.META_CLOUD,
      credentials: {
        phoneNumberId: '123',
        accessToken: 'token',
        appSecret: 'secret',
        verifyToken: 'verify',
      },
    });
    expect(provider).toBeDefined();
    expect(provider.name).toBe('meta_cloud');
  });

  it('should throw for unsupported provider', () => {
    expect(() =>
      WhatsAppProviderFactory.create({
        kind: 'unsupported' as WhatsAppProviderKind,
        credentials: { phoneNumberId: '123', accessToken: 'token' },
      }),
    ).toThrow('Provider de WhatsApp não suportado');
  });
});
