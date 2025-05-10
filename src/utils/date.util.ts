/**
 * 현재 시간을 한국 표준시(KST, UTC+9)의 포맷팅된 문자열로 반환합니다.
 * 
 * @returns {string} 'YYYY-MM-DD HH:MM:SS+09' 형식의 한국 시간 문자열
 * @example
 * // 반환 예시: '2025-05-10 15:30:25+09'
 * const nowKST = getCurrentKSTDateString();
 */
export function getCurrentKSTDateString(): string {
  const now = new Date();
  // KST = UTC + 9시간
  const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  
  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');
  const hours = String(kstDate.getUTCHours()).padStart(2, '0');
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(kstDate.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}+09`;
}

/**
 * 현재 시간으로부터 지정된 분(minutes) 후의 시간을 한국 표준시(KST, UTC+9)로 반환합니다.
 * 
 * @param {number} minutes - 현재 시간에 더할 분(minutes)
 * @returns {string} 'YYYY-MM-DD HH:MM:SS+09' 형식의 지정된 시간 후의 한국 시간 문자열
 * @example
 * // 5분 후의 시간을 얻기
 * // 반환 예시: '2025-05-10 15:35:25+09'
 * const fiveMinutesLater = getKSTDateStringWithOffset(5);
 * 
 * // 1시간(60분) 후의 시간을 얻기
 * const oneHourLater = getKSTDateStringWithOffset(60);
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
  const hours = String(kstDate.getUTCHours()).padStart(2, '0');
  const min = String(kstDate.getUTCMinutes()).padStart(2, '0');
  const sec = String(kstDate.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${min}:${sec}+09`;
}