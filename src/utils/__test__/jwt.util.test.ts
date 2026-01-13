import { isValidJwtFormat, safeExtractPayload } from '../jwt.util';

describe('JWT Utility Functions', () => {
  describe('isValidJwtFormat', () => {
    it('null 입력 시 false를 반환해야 한다', () => {
      expect(isValidJwtFormat(null as unknown as string)).toBe(false);
    });

    it('undefined 입력 시 false를 반환해야 한다', () => {
      expect(isValidJwtFormat(undefined as unknown as string)).toBe(false);
    });

    it('빈 문자열 입력 시 false를 반환해야 한다', () => {
      expect(isValidJwtFormat('')).toBe(false);
    });

    it('문자열이 아닌 타입(숫자, 객체 등) 입력 시 false를 반환해야 한다', () => {
      expect(isValidJwtFormat(123 as unknown as string)).toBe(false);
      expect(isValidJwtFormat({} as unknown as string)).toBe(false);
      expect(isValidJwtFormat([] as unknown as string)).toBe(false);
    });

    it('점(.)이 2개인 토큰(파트 3개)만 true를 반환해야 한다', () => {
      expect(isValidJwtFormat('header.payload.signature')).toBe(true);
    });

    it('점(.)이 2개가 아닌 토큰은 false를 반환해야 한다', () => {
      expect(isValidJwtFormat('invalid.token')).toBe(false);
      expect(isValidJwtFormat('one.two.three.four')).toBe(false);
      expect(isValidJwtFormat('noDotsAtAll')).toBe(false);
    });

    it("빈 파트가 있는 토큰('..' 또는 'header..signature')은 false를 반환해야 한다", () => {
      expect(isValidJwtFormat('..')).toBe(false);
      expect(isValidJwtFormat('header..signature')).toBe(false);
      expect(isValidJwtFormat('.payload.signature')).toBe(false);
      expect(isValidJwtFormat('header.payload.')).toBe(false);
    });

    it('Base64URL 문자셋(A-Za-z0-9_-)만 포함된 토큰은 true를 반환해야 한다', () => {
      expect(isValidJwtFormat('eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoiYzc1MDcyNDAifQ.abc123_-XYZ')).toBe(true);
    });

    it('Base64URL이 아닌 문자(!@#, 한글 등)가 포함된 토큰은 false를 반환해야 한다', () => {
      expect(isValidJwtFormat('invalid!@#.token$.%^&')).toBe(false);
      expect(isValidJwtFormat('한글.토큰.테스트')).toBe(false);
      expect(isValidJwtFormat('header.pay+load.signature')).toBe(false);
    });

    it('유효한 JWT 형식의 토큰은 true를 반환해야 한다', () => {
      // 실제 JWT 형식 토큰
      const validJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYzc1MDcyNDAifQ.dGVzdFNpZ25hdHVyZQ';
      expect(isValidJwtFormat(validJwt)).toBe(true);
    });
  });

  describe('safeExtractPayload', () => {
    it('유효한 JWT에서 페이로드 객체를 추출해야 한다', () => {
      // payload: {"user_id":"c7507240"}
      const validJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoiYzc1MDcyNDAifQ.signature';
      const payload = safeExtractPayload<{ user_id: string }>(validJwt);
      expect(payload).toEqual({ user_id: 'c7507240' });
    });

    it('유효하지 않은 JWT 형식에 대해 null을 반환해야 한다', () => {
      expect(safeExtractPayload('invalid.token')).toBeNull();
      expect(safeExtractPayload('')).toBeNull();
      expect(safeExtractPayload(null as unknown as string)).toBeNull();
    });

    it("손상된 Base64 페이로드('����隊' 등)에 대해 null을 반환해야 한다", () => {
      // 손상된 페이로드를 가진 JWT 형식 토큰 (Base64URL 형식은 유효하지만 디코딩 결과가 손상됨)
      // 'corrupted' base64로 인코딩하면 유효하지 않은 JSON이 됨
      const corruptedPayload = Buffer.from('not-valid-json').toString('base64url');
      const corruptedJwt = `header.${corruptedPayload}.signature`;
      expect(safeExtractPayload(corruptedJwt)).toBeNull();
    });

    it('유효하지 않은 JSON 페이로드에 대해 null을 반환해야 한다', () => {
      // {invalid json} 을 base64url 인코딩
      const invalidJsonPayload = Buffer.from('{invalid: json}').toString('base64url');
      const invalidJwt = `header.${invalidJsonPayload}.signature`;
      expect(safeExtractPayload(invalidJwt)).toBeNull();
    });

    it('제네릭 타입으로 반환 타입을 지정할 수 있어야 한다', () => {
      interface CustomPayload {
        user_id: string;
        exp: number;
      }
      // payload: {"user_id":"c7507240","exp":1234567890}
      const payloadData = { user_id: 'c7507240', exp: 1234567890 };
      const encodedPayload = Buffer.from(JSON.stringify(payloadData)).toString('base64url');
      const jwt = `header.${encodedPayload}.signature`;

      const result = safeExtractPayload<CustomPayload>(jwt);

      expect(result).not.toBeNull();
      expect(result?.user_id).toBe('c7507240');
      expect(result?.exp).toBe(1234567890);
    });
  });
});
