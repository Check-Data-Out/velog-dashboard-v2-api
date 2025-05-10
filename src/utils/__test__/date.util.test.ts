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
    const hour = String(kst.getUTCHours()).padStart(2, '0');
    const minute = String(kst.getUTCMinutes()).padStart(2, '0');
    const second = String(kst.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}+09`;
  };

  it('getCurrentKSTDateString이 KST 포맷의 문자열을 반환해야 한다', () => {
    // 형식 검증
    const result = getCurrentKSTDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+09$/);

    // 현재 시간 기준 내용 검증
    const now = new Date();
    const expected = formatKST(now);

    // 날짜 부분만 검증 (시간은 테스트 실행 중 변할 수 있음)
    expect(result.slice(0, 10)).toBe(expected.slice(0, 10));
  });

  it('getKSTDateStringWithOffset이 KST 포맷의 문자열을 반환해야 한다', () => {
    const result = getKSTDateStringWithOffset(30);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+09$/);
  });

  it('getCurrentKSTDateString은 5분 후와 다른 값을 반환해야 한다', () => {
    // 고정된 시간 설정
    const fixedTime = new originalDate(Date.UTC(2025, 4, 10, 6, 30, 0)); // 2025-05-10 06:30:00 UTC
    const fiveMinutesLater = new originalDate(fixedTime.getTime() + 5 * 60 * 1000);

    let callCount = 0;

    // Date 클래스 모킹
    class MockDate extends originalDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        if (args.length > 0) {
          super(...args);
        } else {
          // new Date()로 호출될 때 다른 시간 반환
          super(callCount++ === 0 ? fixedTime.getTime() : fiveMinutesLater.getTime());
        }
      }
    }

    global.Date = MockDate as unknown as DateConstructor;

    const before = getCurrentKSTDateString();
    const after = getCurrentKSTDateString();

    expect(before).not.toBe(after);
  });

  it('getKSTDateStringWithOffset(0)은 getCurrentKSTDateString과 동일한 값을 반환해야 한다', () => {
    // 시간을 고정하여 두 함수 호출 사이에 실제 시간이 변경되지 않도록 함
    const fixed = Date.now();
    Date.now = jest.fn(() => fixed);

    const current = getCurrentKSTDateString();
    const offsetZero = getKSTDateStringWithOffset(0);

    expect(current).toBe(offsetZero);
  });

  it('getKSTDateStringWithOffset(60)은 정확히 1시간 후 KST 시간을 반환해야 한다', () => {
    // 기준 시간과 1시간 후 시간 설정
    const baseTime = new Date();
    const oneHourLater = new Date(baseTime.getTime() + 60 * 60 * 1000);

    // Date 생성자 모킹
    let callCount = 0;
    jest.spyOn(global, 'Date').mockImplementation(function (this: Date, time?: number | string | Date): Date {
      if (time !== undefined) return new originalDate(time);
      // 첫 호출과 두 번째 호출에서 다른 시간 반환
      return callCount++ === 0 ? baseTime : oneHourLater;
    } as unknown as (time?: number | string | Date) => Date);

    const result = getKSTDateStringWithOffset(60);
    const expected = formatKST(oneHourLater);

    expect(result).toBe(expected);
  });
});