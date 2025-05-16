/**
 * 현재 날짜의 시작 시간(00:00:00)을 한국 표준시(KST, UTC+9)의 포맷팅된 문자열로 반환합니다.
 * 
 * @returns {string} 'YYYY-MM-DD 00:00:00+09' 형식의 한국 시간 문자열
 * @example
 * // 현재 시간이 2025-05-10 15:30:25 KST일 경우
 * // 반환 예시: '2025-05-10 00:00:00+09'
 * const todayStartKST = getCurrentKSTDateString();
 */
export function getCurrentKSTDateString(): string {
  const now = new Date();
  // KST = UTC + 9시간
  const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  
  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');
  
  // 시간은 항상 00:00:00으로 고정
  return `${year}-${month}-${day} 00:00:00+09`;
}

/**
 * 현재 시간으로부터 지정된 분(minutes) 후의 날짜에 대한 시작 시간(00:00:00)을 
 * 한국 표준시(KST, UTC+9)로 반환합니다.
 * 
 * @param {number} minutes - 현재 시간에 더할 분(minutes)
 * @returns {string} 'YYYY-MM-DD 00:00:00+09' 형식의 지정된 날짜의 시작 시간 문자열
 * @example
 * // 현재 시간이 2025-05-10 15:30:25 KST일 경우
 * 
 * // 5분 후 날짜의 시작 시간 (같은 날이므로 동일)
 * // 반환 예시: '2025-05-10 00:00:00+09'
 * const sameDay = getKSTDateStringWithOffset(5);
 * 
 * // 하루 후(1440분)의 날짜 시작 시간
 * // 반환 예시: '2025-05-11 00:00:00+09'
 * const nextDay = getKSTDateStringWithOffset(1440);
 * 
 * // 하루 전(-1440분)의 날짜 시작 시간
 * // 반환 예시: '2025-05-09 00:00:00+09'
 * const previousDay = getKSTDateStringWithOffset(-1440);
 */
export function getKSTDateStringWithOffset(minutes: number): string {
  const now = new Date();
  // 현재 시간에 분을 추가
  const futureTime = new Date(now.getTime() + minutes * 60 * 1000);
  // KST = UTC + 9시간
  const kstDate = new Date(futureTime.getTime() + 9 * 60 * 60 * 1000);
  
  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');
  
  // 시간은 항상 00:00:00으로 고정
  return `${year}-${month}-${day} 00:00:00+09`;
}