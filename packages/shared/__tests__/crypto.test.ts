import {
  encryptSecret,
  decryptSecret,
  encryptJson,
  decryptJson,
} from '../src/crypto';

const TEST_KEY = 'test-encryption-key-for-unit-tests-2024';

beforeEach(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

afterEach(() => {
  delete process.env.ENCRYPTION_KEY;
});

describe('encryptSecret / decryptSecret', () => {
  it('should encrypt and decrypt a string round-trip', () => {
    const plaintext = 'my-secret-password-123';
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(typeof encrypted).toBe('string');

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertexts for the same plaintext (random IV)', () => {
    const plaintext = 'same-secret';
    const enc1 = encryptSecret(plaintext);
    const enc2 = encryptSecret(plaintext);
    expect(enc1).not.toBe(enc2);
    expect(decryptSecret(enc1)).toBe(plaintext);
    expect(decryptSecret(enc2)).toBe(plaintext);
  });

  it('should handle empty strings', () => {
    const encrypted = encryptSecret('');
    expect(decryptSecret(encrypted)).toBe('');
  });

  it('should handle unicode strings', () => {
    const plaintext = 'Olá, mundo! 🌍 café';
    const encrypted = encryptSecret(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it('should throw when ENCRYPTION_KEY is not set', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encryptSecret('test')).toThrow('ENCRYPTION_KEY não configurada');
  });

  it('should throw when decrypting with wrong key', () => {
    const encrypted = encryptSecret('secret');
    process.env.ENCRYPTION_KEY = 'wrong-key';
    expect(() => decryptSecret(encrypted)).toThrow();
  });
});

describe('encryptJson / decryptJson', () => {
  it('should encrypt and decrypt an object round-trip', () => {
    const obj = { apiKey: 'sk-123', appId: 42, nested: { deep: true } };
    const encrypted = encryptJson(obj);
    const decrypted = decryptJson<typeof obj>(encrypted);
    expect(decrypted).toEqual(obj);
  });

  it('should handle arrays', () => {
    const arr = [1, 'two', { three: 3 }];
    const encrypted = encryptJson(arr);
    expect(decryptJson(encrypted)).toEqual(arr);
  });

  it('should handle null and undefined values in objects', () => {
    const obj = { a: null, b: undefined, c: 'value' };
    const encrypted = encryptJson(obj);
    const decrypted = decryptJson(encrypted);
    expect(decrypted).toEqual({ a: null, c: 'value' });
  });
});
