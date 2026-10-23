import { NextFunction, Request, Response, RequestHandler } from 'express';
import logger from '@/configs/logger.config';
import { EmptyResponseDto, LoginResponseDto, NewsletterUnsubscribeQueryDto, QRLoginConfirmRequestDto } from '@/types';
import { QRLoginStatusResponseDto, QRLoginTokenResponseDto } from '@/types/dto/responses/qrResponse.type';
import { UserService } from '@/services/user.service';
import { fetchVelogApi } from '@/modules/velog/velog.api';
import { BadRequestError, QRTokenExpiredError, ServiceUnavailableError } from '@/exception';
import { clearAuthCookies, setSessionCookie } from '@/utils/cookie.util';
import { verifyUnsubscribe } from '@/utils/unsubscribe.util';
import { getNewsletterUnsubscribeSecret } from '@/configs/newsletter.config';
import { getClientIp } from '@/utils/logging.util';

type Token10 = string & { __lengthBrand: 10 };

// IP 를 저장하는 컬럼 길이(IPv6 최대 45자). 클라이언트가 보낸 값이 길어도 저장이 실패하지 않게 자른다
const MAX_IP_LENGTH = 45;

const getStoredClientIp = (req: Pick<Request, 'headers' | 'ip' | 'socket'>): string =>
  getClientIp(req).slice(0, MAX_IP_LENGTH);

export class UserController {
  constructor(private userService: UserService) {}

  login: RequestHandler = async (req: Request, res: Response<LoginResponseDto>, next: NextFunction): Promise<void> => {
    try {
      // 1. 외부 API (velog) 호출로 실존 하는 토큰 & 사용자 인지 검증
      const { accessToken, refreshToken } = req.body;
      const velogUser = await fetchVelogApi(accessToken, refreshToken);

      // 2. 우리쪽 DB에 사용자 존재 여부 체크 후 로그인 바로 진행 또는 사용자 생성 후 로그인 진행
      const user = await this.userService.handleUserTokensByVelogUUID(velogUser, accessToken, refreshToken);

      // 3. 로그인 완료 후 세션 쿠키 세팅 (velog 토큰은 브라우저로 보내지 않는다)
      setSessionCookie(res, user);

      const response = new LoginResponseDto(
        true,
        '로그인에 성공하였습니다.',
        { id: user.id, username: user.username || '', profile: { thumbnail: user.thumbnail || '' } },
        null,
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error('로그인 실패 : ', error);
      next(error);
    }
  };

  sampleLogin: RequestHandler = async (
    req: Request,
    res: Response<LoginResponseDto>,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const sampleUser = await this.userService.findSampleUser();

      setSessionCookie(res, sampleUser);

      req.user = sampleUser;

      const response = new LoginResponseDto(
        true,
        '로그인에 성공하였습니다.',
        {
          id: sampleUser.id,
          username: '테스트 유저',
          profile: { thumbnail: 'https://velog.io/favicon.ico' },
        },
        null,
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error('로그인 실패 : ', error);
      next(error);
    }
  };

  logout: RequestHandler = async (req: Request, res: Response<EmptyResponseDto>, next: NextFunction) => {
    try {
      await this.userService.logout(req.user);

      clearAuthCookies(res);

      const response = new EmptyResponseDto(true, '로그아웃에 성공하였습니다.', {}, null);

      res.status(200).json(response);
    } catch (error) {
      logger.error(`로그아웃 실패: [userId: ${req.user?.id || 'anonymous'}]`, error);
      next(error);
    }
  };

  fetchCurrentUser: RequestHandler = async (req: Request, res: Response<LoginResponseDto>) => {
    const currentUser = req.user;

    // 인가 middle 에서 만든 객체 그대로 재활용
    const username = currentUser.username || '';
    const profile = { thumbnail: currentUser.thumbnail || '' };

    const response = new LoginResponseDto(
      true,
      '유저 정보 조회에 성공하였습니다.',
      { id: currentUser.id, username: username, profile: profile },
      null,
    );

    res.status(200).json(response);
  };

  createToken: RequestHandler = async (req: Request, res: Response<QRLoginTokenResponseDto>, next: NextFunction) => {
    try {
      const user = req.user;
      const ip = getStoredClientIp(req);
      // users_qrlogintoken.user_agent 가 varchar(255) 라 넘치면 INSERT 가 실패한다
      const userAgent = (req.headers['user-agent'] || '').slice(0, 255);

      const token = await this.userService.createUserQRToken(user.id, ip, userAgent);
      const typedToken = token as Token10;

      const response = new QRLoginTokenResponseDto(true, 'QR 토큰 생성 완료', { token: typedToken }, null);
      res.status(200).json(response);
    } catch (error) {
      logger.error(`QR 토큰 생성 실패: [userId: ${req.user?.id || 'anonymous'}]`, error);
      next(error);
    }
  };

  /**
   * QR 코드 URL 진입점. 링크 미리보기나 스캐너가 먼저 열어도 토큰이 소비되지 않도록 상태를 바꾸지 않고
   * FE 확인 화면으로만 보낸다. 토큰 검증은 확인(POST) 단계에서 한다.
   */
  getToken: RequestHandler = (req: Request, res: Response) => {
    const token = req.query.token;
    res.redirect(typeof token === 'string' && token ? `/qr-login?token=${encodeURIComponent(token)}` : '/qr-login');
  };

  confirmToken: RequestHandler = async (
    req: Request<object, object, QRLoginConfirmRequestDto>,
    res: Response<EmptyResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const user = await this.userService.useToken(
        req.body.token,
        getStoredClientIp(req),
        req.headers['user-agent'] || '',
      );
      if (!user) {
        throw new QRTokenExpiredError();
      }

      setSessionCookie(res, user);

      const response = new EmptyResponseDto(true, 'QR 로그인에 성공하였습니다.', {}, null);
      res.status(200).json(response);
    } catch (error) {
      logger.error('QR 토큰 로그인 확인 실패 : ', error);
      next(error);
    }
  };

  getTokenStatus: RequestHandler = async (
    req: Request,
    res: Response<QRLoginStatusResponseDto>,
    next: NextFunction,
  ) => {
    try {
      // validateRequestDto(QRLoginStatusQueryDto, 'query') 가 10자리 문자열임을 보장한다
      const token = req.query.token as string;
      const status = await this.userService.getQRLoginTokenStatus(token, req.user.id);

      const response = new QRLoginStatusResponseDto(true, 'QR 토큰 상태 조회 완료', status, null);
      res.status(200).json(response);
    } catch (error) {
      logger.error(`QR 토큰 상태 조회 실패: [userId: ${req.user?.id || 'anonymous'}]`, error);
      next(error);
    }
  };

  /**
   * 메일 링크 진입점. 서명 링크(uid·sig)는 링크 미리보기·스캐너가 먼저 열어도 수신거부되지 않도록
   * 상태를 바꾸지 않고 FE 확인 페이지로 보낸다. 서명 검증은 POST 에서 한다.
   * uid·sig 는 분석 도구가 수집하는 query 가 아니라 fragment 에 담아 넘긴다.
   * 기존 `?email=` 링크는 서명 링크로 옮기는 동안 바로 수신거부한다.
   */
  unsubscribeNewsletter: RequestHandler = async (req: Request, res: Response<EmptyResponseDto>, next: NextFunction) => {
    const { uid, sig } = req.query;
    if (typeof uid === 'string' && typeof sig === 'string') {
      res.redirect(`/newsletter/unsubscribe#uid=${encodeURIComponent(uid)}&sig=${encodeURIComponent(sig)}`);
      return;
    }

    try {
      const email = req.query.email as string;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email || !emailRegex.test(email)) {
        logger.error('올바르지 않은 이메일로 뉴스레터 구독 해제 요청');
      } else {
        await this.userService.unsubscribeNewsletter(email, {
          source: '기존 email 링크',
          ip: getClientIp(req),
          userAgent: req.headers['user-agent'] || '',
        });
      }

      res.redirect('/main');
    } catch (error) {
      logger.error('뉴스레터 구독 해제 실패 [기존 email 링크]', error);
      next(error);
    }
  };

  /**
   * 서명 링크 수신거부 처리. FE 확인 페이지와 메일 사업자 원클릭(RFC 8058)이 함께 쓴다.
   * 쿠키·body 에 의존하지 않고 URL 의 uid·sig 만 보며, 리다이렉트하지 않는다.
   */
  confirmUnsubscribeNewsletter: RequestHandler = async (
    req: Request,
    res: Response<EmptyResponseDto>,
    next: NextFunction,
  ) => {
    try {
      // validateRequestDto(NewsletterUnsubscribeQueryDto, 'query') 가 uid·sig 형식을 보장한다
      const { uid, sig } = req.query as unknown as NewsletterUnsubscribeQueryDto;
      const secret = getNewsletterUnsubscribeSecret();
      if (!secret) {
        throw new ServiceUnavailableError('지금은 수신거부를 처리할 수 없습니다.', 'UNSUBSCRIBE_UNAVAILABLE');
      }
      if (!verifyUnsubscribe(secret, uid, sig)) {
        throw new BadRequestError('유효하지 않은 수신거부 링크입니다.', 'INVALID_UNSUBSCRIBE_LINK');
      }

      await this.userService.unsubscribeNewsletterById(Number(uid), {
        // FE 확인 페이지는 같은 출처라 Origin 을 보내고, 메일 사업자 POST 는 보내지 않는다
        source: req.headers.origin ? '확인 페이지' : '원클릭(메일 사업자)',
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
      });

      const response = new EmptyResponseDto(true, '뉴스레터 수신거부가 처리되었습니다.', {}, null);
      res.status(200).json(response);
    } catch (error) {
      // 서명 불일치는 링크 스캐너·변조 링크가 흔히 일으키는 요청 오류이고, 키 미설정은 기동 시 이미 경고했으므로 경고로만 남긴다
      if (error instanceof BadRequestError || error instanceof ServiceUnavailableError) {
        logger.warn(`뉴스레터 수신거부 거부: [uid: ${req.query.uid}] ${error.message}`);
      } else {
        logger.error(`뉴스레터 수신거부 실패: [uid: ${req.query.uid}]`, error);
      }
      next(error);
    }
  };
}
