const BASE64URL_REGEX = /^[A-Za-z0-9_-]+$/;

/**
 * JWT 토큰의 형식이 유효한지 검사합니다.
 * DB 쿼리 전에 빠르게 잘못된 토큰을 거부하기 위한 Fail-Fast 검증입니다.
 * @param token - 검증할 JWT 토큰 문자열
 * @returns 유효한 JWT 형식이면 true, 아니면 false
 */
export const isValidJwtFormat = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;
  if (parts.some((part) => part.length === 0)) return false;
  if (!parts.every((part) => BASE64URL_REGEX.test(part))) return false;

  return true;
};

/**
 * JWT 토큰에서 페이로드를 안전하게 추출합니다.
 * Base64 디코딩 실패, JSON 파싱 실패 시 예외 대신 null을 반환합니다.
 * 주의: 이 함수는 형식 검증을 수행하지 않습니다. 형식 검증이 필요하면 isValidJwtFormat을 먼저 호출하세요.
 * @param token - 페이로드를 추출할 JWT 토큰 문자열
 * @returns 추출된 페이로드 객체 또는 null
 */
export const safeExtractPayload = <T>(token: string): T | null => {
  try {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length < 2 || !parts[1]) return null;

    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
};
