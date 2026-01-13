const BASE64URL_REGEX = /^[A-Za-z0-9_-]+$/;

export const isValidJwtFormat = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;
  if (parts.some((part) => part.length === 0)) return false;
  if (!parts.every((part) => BASE64URL_REGEX.test(part))) return false;

  return true;
};

export const safeExtractPayload = <T>(token: string): T | null => {
  if (!isValidJwtFormat(token)) return null;

  try {
    const payload = Buffer.from(token.split('.')[1], 'base64url').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
};
