import { getCurrentKSTDateString, getKSTDateStringWithOffset } from '../date.util';

describe('Date Utilities', () => {
  // 원본 Date 객체와 Date.now 함수 저장
  let originalDate: DateConstructor;
  let originalDateNow: () => number;

  beforeAll(() => {
    originalDate = global.Date;
    originalDateNow = Date.now;
  });

  afterAll(() => {
    // 테스트 종료 후 원래 객체로 복원
    global.Date = originalDate;
    Date.now = originalDateNow;
  });

  afterEach(() => {
    // 각 테스트 후 모킹 제거 및 원래 객체로 복원
    jest.restoreAllMocks();
    global.Date = originalDate;
    Date.now = originalDateNow;
  });

  /**
   * Date 객체를 KST 포맷 문자열로 변환하는 헬퍼 함수
   * @param date 변환할 Date 객체
   * @returns KST 포맷의 문자열 (YYYY-MM-DD HH:MM:SS+09)
   */
  const formatKST = (date: Date): string => {
    const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const year = kst.getUTCFullYear();
    const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
    const day = String(kst.getUTCDate()).padStart(2, '0');
    // 시간을 00:00:00으로 고정
    return `${year}-${month}-${day} 00:00:00+09`;
  };

  it('getCurrentKSTDateString이 KST 포맷의 문자열을 반환해야 한다', () => {
    // 형식 검증 - HH:MM:SS가 항상 00:00:00
    const result = getCurrentKSTDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} 00:00:00\+09$/);

    // 현재 날짜 기준 내용 검증
    const now = new Date();
    const expected = formatKST(now);

    // 전체 문자열을 비교 (시간은 항상 00:00:00)
    expect(result).toBe(expected);
  });

  it('getKSTDateStringWithOffset이 KST 포맷의 문자열을 반환해야 한다', () => {
    const result = getKSTDateStringWithOffset(30);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+09$/);
  });

  it('getKSTDateStringWithOffset(0)은 getCurrentKSTDateString과 동일한 값을 반환해야 한다', () => {
    // 시간을 고정하여 두 함수 호출 사이에 실제 시간이 변경되지 않도록 함
    const fixedDate = new Date();
    const fixed = fixedDate.getTime();
    Date.now = jest.fn(() => fixed);
    jest.spyOn(global, 'Date').mockImplementation(() => fixedDate);

    const current = getCurrentKSTDateString();
    const offsetZero = getKSTDateStringWithOffset(0);

    expect(current).toBe(offsetZero);
  });

  it('getCurrentKSTDateString은 날짜가 변경될 때만 다른 값을 반환해야 한다', () => {
    // 고정된 시간 설정
    const fixedTime = new originalDate(Date.UTC(2025, 4, 10, 6, 30, 0)); // 2025-05-10 06:30:00 UTC

    // 같은 날 5분 후
    const sameDay = new originalDate(fixedTime.getTime() + 5 * 60 * 1000);

    // 다음 날 (날짜가 변경됨)
    const nextDay = new originalDate(fixedTime.getTime() + 24 * 60 * 60 * 1000);

    let callCount = 0;

    // Date 클래스 모킹
    class MockDate extends originalDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        if (args.length > 0) {
          super(...args);
        } else {
          // 호출 순서에 따라 다른 시간 반환
          if (callCount === 0) {
            super(fixedTime.getTime());
          } else if (callCount === 1) {
            super(sameDay.getTime());
          } else {
            super(nextDay.getTime());
          }
          callCount++;
        }
      }
    }

    global.Date = MockDate as unknown as DateConstructor;

    const first = getCurrentKSTDateString();
    const second = getCurrentKSTDateString(); // 같은 날
    const third = getCurrentKSTDateString(); // 다음 날

    expect(first).toBe(second); // 같은 날이므로 동일해야 함
    expect(first).not.toBe(third); // 다른 날이므로 달라야 함
  });

  it('getKSTDateStringWithOffset(1440)은 정확히 하루 후의 날짜를 반환해야 한다', () => {
    // 기준 시간과 하루 후 시간 설정
    const baseTime = new Date();
    const nextDay = new Date(baseTime.getTime() + 24 * 60 * 60 * 1000);

    // Date 생성자 모킹
    let callCount = 0;
    jest.spyOn(global, 'Date').mockImplementation(function (this: Date, time?: number | string | Date): Date {
      if (time !== undefined) return new originalDate(time);
      // 첫 호출과 두 번째 호출에서 다른 시간 반환
      return callCount++ === 0 ? baseTime : nextDay;
    } as unknown as (time?: number | string | Date) => Date);

    const result = getKSTDateStringWithOffset(1440); // 1440분 = 24시간 = 1일
    const expected = formatKST(nextDay);

    expect(result).toBe(expected);
  });
});
