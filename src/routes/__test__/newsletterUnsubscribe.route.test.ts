import http from 'http';
import { AddressInfo } from 'net';
import { createApp } from '@/app';
import { ICache } from '@/modules/cache/cache.type';
import { UserService } from '@/services/user.service';
import { signUnsubscribe } from '@/utils/unsubscribe.util';

// 실제 앱 구성(createApp) 그대로 띄우되, DB·Redis 연결만 끊어 둔다
jest.mock('@/configs/db.config', () => ({ __esModule: true, default: { query: jest.fn() } }));
jest.mock('@/configs/cache.config', () => ({ getCacheStatus: jest.fn() }));
jest.mock('@/configs/logger.config', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));

type RawResponse = { status: number; headers: http.IncomingHttpHeaders };

describe('POST /api/user/newsletter-unsubscribe (앱 전체 경로)', () => {
  const sig = signUnsubscribe(process.env.NEWSLETTER_UNSUBSCRIBE_SECRET as string, 42);
  const path = `/api/user/newsletter-unsubscribe?uid=42&sig=${encodeURIComponent(sig)}`;
  let server: http.Server;
  let unsubscribe: jest.SpyInstance;

  const post = async (headers: http.OutgoingHttpHeaders, body: string): Promise<RawResponse> =>
    new Promise((resolve, reject) => {
      const { port } = server.address() as AddressInfo;
      const req = http.request({ host: '127.0.0.1', port, path, method: 'POST', headers }, (res) => {
        res.resume();
        res.on('end', () => resolve({ status: res.statusCode as number, headers: res.headers }));
      });
      req.on('error', reject);
      req.end(body);
    });

  beforeAll(async () => {
    server = http.createServer(createApp({} as ICache));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    unsubscribe = jest.spyOn(UserService.prototype, 'unsubscribeNewsletterById').mockResolvedValue();
  });

  afterEach(() => {
    unsubscribe.mockRestore();
  });

  it('메일 사업자의 원클릭 POST(Origin·쿠키 없음, urlencoded)는 리다이렉트 없이 200 이어야 한다', async () => {
    const res = await post({ 'Content-Type': 'application/x-www-form-urlencoded' }, 'List-Unsubscribe=One-Click');

    expect(res.status).toBe(200);
    expect(res.headers.location).toBeUndefined();
    expect(unsubscribe).toHaveBeenCalledWith(42, expect.objectContaining({ source: '원클릭(메일 사업자)' }));
  });

  it('multipart 본문으로 보낸 원클릭 POST 도 200 이어야 한다', async () => {
    const boundary = 'vd2-boundary';
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="List-Unsubscribe"',
      '',
      'One-Click',
      `--${boundary}--`,
      '',
    ].join('\r\n');

    const res = await post({ 'Content-Type': `multipart/form-data; boundary=${boundary}` }, body);

    expect(res.status).toBe(200);
    expect(res.headers.location).toBeUndefined();
    expect(unsubscribe).toHaveBeenCalledWith(42, expect.anything());
  });

  it('다른 사이트 Origin 의 POST 는 403 으로 거부하고 수신거부하지 않아야 한다', async () => {
    const res = await post(
      { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://other.example' },
      'List-Unsubscribe=One-Click',
    );

    expect(res.status).toBe(403);
    expect(unsubscribe).not.toHaveBeenCalled();
  });
});
