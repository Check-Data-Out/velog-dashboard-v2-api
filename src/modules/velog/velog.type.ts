
/**
 * Velog 쪽에서 사용하는 토큰을 사용할때 실제 payload 값
 */
export interface VelogJWTPayload {
  user_id: string;  // UUID 값, key를 바꿀 순 없음
  iat: number;  // issued at timestamp
  exp: number;  // expiration timestamp
  iss: string;  // issuer
  sub: string;  // subject
}


/**
 * Velog 쪽에서 사용하는, 실제 currentUser API 호출시 주는 값 중 일부분
 */
export interface VelogUserCurrentResponse {
  id: string;  // 이는 실제로 uuid를 줌
  username: string;
  email: string | null;
  profile: {
    thumbnail: string;
  };
}
