import jwt from 'jsonwebtoken';
import { signSession, verifySession } from '@/utils/session.util';
import { mockUser } from '@/utils/fixtures';

const SECRET = process.env.SESSION_JWT_SECRET as string;

describe('session.util', () => {
  it('발급한 세션은 HS256 으로 서명되고 사용자 id·velog uuid·세션 버전을 담는다', () => {
    const token = signSession({ ...mockUser, session_version: 3 });

    expect(jwt.decode(token, { complete: true })?.header.alg).toBe('HS256');
    expect(verifySession(token)).toEqual(
      expect.objectContaining({ sub: String(mockUser.id), uid: mockUser.velog_uuid, ver: 3 }),
    );
  });

  describe('검증 실패', () => {
    const claims = { uid: mockUser.velog_uuid, ver: 0 };
    const valid = { subject: String(mockUser.id), issuer: 'velog-dashboard-api', audience: 'velog-dashboard' };
    const unsigned = (payload: object) =>
      `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(
        JSON.stringify(payload),
      ).toString('base64url')}.`;

    it.each([
      ['다른 알고리즘', () => jwt.sign(claims, SECRET, { ...valid, algorithm: 'HS512' })],
      [
        '서명 없음(alg none)',
        () => unsigned({ ...claims, sub: valid.subject, iss: valid.issuer, aud: valid.audience }),
      ],
      ['만료', () => jwt.sign({ ...claims, exp: Math.floor(Date.now() / 1000) - 60 }, SECRET, valid)],
      ['발급자 불일치', () => jwt.sign(claims, SECRET, { ...valid, issuer: 'someone-else' })],
      ['대상 불일치', () => jwt.sign(claims, SECRET, { ...valid, audience: 'someone-else' })],
      ['세션 버전이 없는', () => jwt.sign({ uid: mockUser.velog_uuid }, SECRET, valid)],
      ['다른 키', () => jwt.sign(claims, 'another-secret-0123456789abcdef0123', valid)],
    ])('%s 토큰은 null 을 돌려준다', (_, makeToken) => {
      expect(verifySession(makeToken())).toBeNull();
    });
  });
});
