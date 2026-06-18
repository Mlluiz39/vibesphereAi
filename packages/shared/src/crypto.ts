import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Criptografia simétrica AES-256-GCM para segredos em repouso (ex.: credenciais
 * de provider de WhatsApp) — base do Requisito 11.3.
 *
 * A chave vem de ENCRYPTION_KEY; derivamos 32 bytes via SHA-256 para aceitar
 * qualquer string de chave. O formato de saída é base64 de: iv(12) | tag(16) | ciphertext.
 */
const IV_LENGTH = 12;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ENCRYPTION_KEY não configurada');
  }
  return createHash('sha256').update(raw).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
  const enc = buf.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

/** Serializa + criptografa um objeto de credenciais. */
export function encryptJson(value: unknown): string {
  return encryptSecret(JSON.stringify(value));
}

/** Descriptografa + parseia para um objeto de credenciais. */
export function decryptJson<T>(payload: string): T {
  return JSON.parse(decryptSecret(payload)) as T;
}
