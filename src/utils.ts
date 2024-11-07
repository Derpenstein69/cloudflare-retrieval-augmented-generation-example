
import { webcrypto } from 'node:crypto';

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await webcrypto.subtle.digest('SHA-256', data);
  return Buffer.from(hash).toString('hex');
}

export function generateSecureKey(length: number = 32): string {
  const bytes = new Uint8Array(length);
  webcrypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64');
}

export async function verifyPassword(inputPassword: string, hashedPassword: string): Promise<boolean> {
  const hashedInput = await hashPassword(inputPassword);
  return hashedInput === hashedPassword;
}