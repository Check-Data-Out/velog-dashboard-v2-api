import logger from '@/configs/logger.config';
import { NotFoundError, TokenError, UnauthorizedError } from '@/exception/';
import { getKeyByGroup } from '@/utils/key.util';
import AESEncryption from '@/modules/token_encryption/aes_encryption';
import { sendSlackMessage } from '@/modules/slack/slack.notifier';
import { SAMPLE_USER_VELOG_UUID, UserRepository } from '@/repositories/user.repository';
import { UserWithTokenDto, User } from '@/types';
import { generateRandomGroupId } from '@/utils/generateGroupId.util';
import { generateRandomToken } from '@/utils/generateRandomToken.util';
import { VelogUserCurrentResponse } from '@/modules/velog/velog.type';
import { QRLoginTokenStatus } from '@/types/models/QRLoginToken.type';

/** 수신거부 요청 경로. Slack 알림에서 어디서 왔는지 구분한다. */
export type NewsletterUnsubscribeSource = '확인 페이지' | '원클릭(메일 사업자)' | '기존 email 링크';

export interface NewsletterUnsubscribeContext {
  source: NewsletterUnsubscribeSource;
  ip: string;
  userAgent: string;
}

export class UserService {
  constructor(private userRepo: UserRepository) {}

  private encryptTokens(groupId: number, accessToken: string, refreshToken: string) {
    const key = getKeyByGroup(groupId);
    if (!key) {
      logger.error('그룹 키 조회 중 실패');
      throw new TokenError('올바르지 않은 그룹 ID로 인해 암호화 키를 찾을 수 없습니다.');
    }
    try {
      const aes = new AESEncryption(key);

      return {
        encryptedAccessToken: aes.encrypt(accessToken),
        encryptedRefreshToken: aes.encrypt(refreshToken),
      };
    } catch (error) {
      logger.error('User Service encryptTokens error : ', error);
      throw new TokenError('토큰 암호화 처리에 실패하였습니다.');
    }
  }

  async handleUserTokensByVelogUUID(
    userData: VelogUserCurrentResponse,
    accessToken: string,
    refreshToken: string,
  ): Promise<User> {
    // velog response 에서 주는 응답 혼용 방지를 위한 변경 id -> uuid
    const { id: uuid, email = null, username, profile } = userData;
    const thumbnail = profile?.thumbnail || null; // undefined 방어
    try {
      let user = await this.userRepo.findByUserVelogUUID(uuid);

      // 신규 유저라면 암호화가 안된 token 으로 사용자를 우선 바로 생성
      if (!user) {
        user = await this.createUser({
          uuid,
          email,
          username,
          thumbnail,
          accessToken,
          refreshToken,
        });
      }

      // 이제 부터는 모든 유저는 기유저로 판단, 로그인 할때마다 토큰을 업데이트 해줌
      // 대신 토큰은 무조건 암호화 된 상태로만 저장되게 업데이트 로직
      const { encryptedAccessToken, encryptedRefreshToken } = this.encryptTokens(
        user.group_id,
        accessToken,
        refreshToken,
      );

      return await this.updateUserTokens({
        uuid,
        email,
        username,
        thumbnail,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
      });
    } catch (error) {
      logger.error('User Service handleUserTokensByVelogUUID 중 오류 발생 : ', error);
      throw error;
    }
  }

  async findSampleUser(): Promise<User> {
    const user = await this.userRepo.findSampleUser();
    if (!user) {
      throw new NotFoundError('샘플 유저 정보를 찾을 수 없습니다.');
    }

    logger.info('샘플 유저 로그인');
    return user;
  }

  async createUser(userData: UserWithTokenDto) {
    const groupId = generateRandomGroupId();
    const newUser = await this.userRepo.createUser(
      userData.uuid,
      userData.email,
      userData.username,
      userData.thumbnail,
      userData.accessToken,
      userData.refreshToken,
      groupId,
    );

    // 신규 유저 웹훅 알림
    try {
      await sendSlackMessage(`새로운 유저 등록: ${userData.uuid}${userData.email ? `, ${userData.email}` : ''}`);
    } catch (error) {
      // Slack 알림 실패는 사용자 생성에 영향을 주지 않도록
      logger.error('Slack 알림 전송 실패:', error);
    }
    return newUser;
  }

  async updateUserTokens(userData: UserWithTokenDto) {
    return await this.userRepo.updateTokens(
      userData.uuid,
      userData.email,
      userData.username,
      userData.thumbnail,
      userData.accessToken,
      userData.refreshToken,
    );
  }

  async createUserQRToken(userId: number, ip: string, userAgent: string): Promise<string> {
    const token = generateRandomToken(10);
    await this.userRepo.createQRLoginToken(token, userId, ip, userAgent);
    return token;
  }

  /**
   * QR 토큰을 소비하고 토큰 주인을 돌려줍니다. 소비할 수 없는 토큰이면 null 입니다.
   */
  async useToken(token: string, ip: string, userAgent: string): Promise<User | null> {
    const userId = await this.userRepo.consumeQRLoginToken(token, ip, userAgent);
    if (userId === null) {
      return null;
    }

    const user = await this.userRepo.findByUserId(userId);
    if (!user || !user.is_active) {
      throw new UnauthorizedError('로그인할 수 없는 사용자입니다.');
    }

    return user;
  }

  async getQRLoginTokenStatus(token: string, userId: number): Promise<QRLoginTokenStatus> {
    return await this.userRepo.findQRLoginTokenStatus(token, userId);
  }

  /**
   * 그 사용자의 모든 기기 세션을 끊고, 아직 쓰지 않은 QR 로그인 토큰도 사용 처리합니다.
   */
  async logout(user: User): Promise<void> {
    // 샘플 계정은 여러 방문자가 함께 쓰므로 자기 쿠키만 지운다
    if (user.velog_uuid === SAMPLE_USER_VELOG_UUID) return;

    await this.userRepo.updateQRLoginTokenToUse(user.id);
    await this.userRepo.incrementSessionVersion(user.id);
  }

  async unsubscribeNewsletter(email: string) {
    try {
      const user = await this.userRepo.findByUserEmail(email);

      if (!user) {
        logger.error(`유저를 찾을 수 없습니다. [email: ${email}]`);
        return; // 일반적인 실패시 조용히 리디렉션
      }

      if (!user.newsletter_subscribed) {
        logger.error(`이미 구독이 해제된 이메일입니다. [email: ${email}]`);
        return; // 일반적인 실패시 조용히 리디렉션
      }

      await this.userRepo.unsubscribeNewsletter(user.id);

      try {
        await sendSlackMessage(`뉴스레터 구독 취소: ${email} (id: ${user.id})`);
      } catch (error) {
        logger.error('Slack 알림 전송 실패:', error);
      }
    } catch (error) {
      logger.error('User Service unsubscribeNewsletter Error : ', error);
      throw error;
    }
  }

  /**
   * 서명 링크로 들어온 수신거부. 없는 사용자·이미 수신거부한 사용자도 오류 없이 끝난다(멱등).
   */
  async unsubscribeNewsletterById(id: number, context: NewsletterUnsubscribeContext): Promise<void> {
    const user = await this.userRepo.findByUserId(id);
    if (!user) {
      logger.info(`뉴스레터 수신거부 대상 사용자가 없습니다. [userId: ${id}]`);
      return;
    }

    const alreadyUnsubscribed = !user.newsletter_subscribed;
    if (!alreadyUnsubscribed) {
      await this.userRepo.unsubscribeNewsletter(user.id);
    }

    const processedAt = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' });
    try {
      await sendSlackMessage(
        [
          '뉴스레터 수신거부',
          `- 사용자: ${user.username ?? '-'} (id: ${user.id})`,
          `- 이메일: ${user.email ?? '-'}`,
          `- 처리 시각: ${processedAt} KST`,
          `- 경로: ${context.source}`,
          `- IP: ${context.ip || '-'}`,
          `- User-Agent: ${context.userAgent || '-'}`,
          `- 이미 수신거부 상태: ${alreadyUnsubscribed ? '예' : '아니오'}`,
        ].join('\n'),
      );
    } catch (error) {
      logger.error('Slack 알림 전송 실패:', error);
    }
  }
}
