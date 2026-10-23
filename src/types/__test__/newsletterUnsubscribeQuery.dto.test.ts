import 'reflect-metadata';
import { Request, Response } from 'express';
import { validateRequestDto } from '@/middlewares/validation.middleware';
import { NewsletterUnsubscribeQueryDto } from '@/types';
import { BadRequestError } from '@/exception';

describe('NewsletterUnsubscribeQueryDto', () => {
  const middleware = validateRequestDto(NewsletterUnsubscribeQueryDto, 'query');
  const run = async (query: object) => {
    const next = jest.fn();
    await middleware({ query } as unknown as Request, {} as Response, next);
    return next;
  };

  it.each([
    ['서명 없음', { uid: '42' }],
    ['uid 없음', { sig: 'sig' }],
    ['빈 서명', { uid: '42', sig: '' }],
    ['앞자리 0', { uid: '042', sig: 'sig' }],
    ['0', { uid: '0', sig: 'sig' }],
    ['숫자가 아닌 uid', { uid: '42abc', sig: 'sig' }],
    ['20자리 uid', { uid: '1'.repeat(20), sig: 'sig' }],
    ['배열 uid', { uid: ['42', '43'], sig: 'sig' }],
  ])('%s 이면 400 으로 거부해야 한다', async (_, query) => {
    expect(await run(query)).toHaveBeenCalledWith(expect.any(BadRequestError));
  });

  it('형식이 맞으면 통과시켜야 한다', async () => {
    expect(await run({ uid: '42', sig: 'PJT8snaX4RoJtPxS8SJBVracgxS_c0eIMiT9gFKdIKc' })).toHaveBeenCalledWith();
  });
});
