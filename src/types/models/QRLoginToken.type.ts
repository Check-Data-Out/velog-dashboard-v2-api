/**
 * 데스크톱이 폴링으로 확인하는 QR 토큰 상태. 기기 정보는 used 일 때만 있다.
 */
export type QRLoginTokenStatus =
  | { status: 'pending' | 'expired' }
  | { status: 'used'; usedAt: string; userAgent: string | null; ip: string | null };
