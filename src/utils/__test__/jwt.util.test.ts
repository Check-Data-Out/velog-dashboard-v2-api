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
    // 참고: safeExtractPayload는 형식 검증을 하지 않음
    // 형식 검증이 필요하면 isValidJwtFormat을 먼저 호출해야 함

    describe('유효한 입력', () => {
      it('유효한 JWT에서 페이로드 객체를 추출해야 한다', () => {
        // payload: {"user_id":"c7507240"}
        const validJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoiYzc1MDcyNDAifQ.signature';
        const payload = safeExtractPayload<{ user_id: string }>(validJwt);
        expect(payload).toEqual({ user_id: 'c7507240' });
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

    describe('잘못된 입력에 대한 방어', () => {
      it('null/undefined/빈 문자열 입력 시 null을 반환해야 한다', () => {
        expect(safeExtractPayload('')).toBeNull();
        expect(safeExtractPayload(null as unknown as string)).toBeNull();
        expect(safeExtractPayload(undefined as unknown as string)).toBeNull();
      });

      it('페이로드 파트가 없는 토큰에 대해 null을 반환해야 한다', () => {
        expect(safeExtractPayload('noDotsAtAll')).toBeNull();
        expect(safeExtractPayload('onlyOnePart.')).toBeNull();
      });
    });

    describe('디코딩/파싱 실패', () => {
      it('유효하지 않은 JSON 페이로드에 대해 null을 반환해야 한다', () => {
        // 'invalid.token'의 두 번째 파트 'token'은 유효한 JSON이 아님
        expect(safeExtractPayload('invalid.token')).toBeNull();

        // {invalid: json} 을 base64url 인코딩
        const invalidJsonPayload = Buffer.from('{invalid: json}').toString('base64url');
        const invalidJwt = `header.${invalidJsonPayload}.signature`;
        expect(safeExtractPayload(invalidJwt)).toBeNull();
      });

      it('손상된 Base64 페이로드에 대해 null을 반환해야 한다', () => {
        const corruptedPayload = Buffer.from('not-valid-json').toString('base64url');
        const corruptedJwt = `header.${corruptedPayload}.signature`;
        expect(safeExtractPayload(corruptedJwt)).toBeNull();
      });
    });
  });
});
