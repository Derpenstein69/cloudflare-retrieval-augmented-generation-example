export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

export function generateSecureKey(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}