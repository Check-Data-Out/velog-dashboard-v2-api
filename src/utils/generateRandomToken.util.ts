import crypto from 'crypto';

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~!';
const CHARSET_LENGTH = CHARSET.length;

export function generateRandomToken(length: number = 10): string {
  const randomBytes = crypto.randomBytes(length);
  const result = new Array(length);

  for (let i = 0; i < length; i++) {
    result[i] = CHARSET[randomBytes[i] % CHARSET_LENGTH];
  }

  return result.join('');
}
