import logger from '@/configs/logger.config';
import { NotFoundError, TokenError } from '@/exception/';
import { getKeyByGroup } from '@/utils/key.util';
import AESEncryption from '@/modules/token_encryption/aes_encryption';
import { sendSlackMessage } from '@/modules/slack/slack.notifier';
import { UserRepository } from '@/repositories/user.repository';
import { UserWithTokenDto, User, SampleUser } from '@/types';
import { generateRandomGroupId } from '@/utils/generateGroupId.util';
import { generateRandomToken } from '@/utils/generateRandomToken.util';
import { VelogUserCurrentResponse } from '@/modules/velog/velog.type';

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

  private decryptTokens(groupId: number, accessToken: string, refreshToken: string) {
    const key = getKeyByGroup(groupId);
    if (!key) {
      logger.error('그룹 키 조회 중 실패');
      throw new TokenError('올바르지 않은 그룹 ID로 인해 암호화 키를 찾을 수 없습니다.');
    }
    try {
      const aes = new AESEncryption(key);

      return {
        decryptedAccessToken: aes.decrypt(accessToken),
        decryptedRefreshToken: aes.decrypt(refreshToken),
      };
    } catch (error) {
      logger.error('User Service decryptTokens error : ', error);
      throw new TokenError('토큰 복호화 처리에 실패하였습니다.');
    }
  }

  async handleUserTokensByVelogUUID(
    userData: VelogUserCurrentResponse,
    accessToken: string,
    refreshToken: string,
  ): Promise<User> {
    // velog response 에서 주는 응답 혼용 방지를 위한 변경 id -> uuid
    const { id: uuid, email = null } = userData;
    try {
      let user = await this.userRepo.findByUserVelogUUID(uuid);

      // 신규 유저라면 암호화가 안된 token 으로 사용자를 우선 바로 생성
      if (!user) {
        user = await this.createUser({
          uuid,
          email,
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
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
      });
    } catch (error) {
      logger.error('User Service handleUserTokensByVelogUUID 중 오류 발생 : ', error);
      throw error;
    }
  }

  async findSampleUser(): Promise<SampleUser> {
    const user = await this.userRepo.findSampleUser();
    if (!user) {
      throw new NotFoundError('샘플 유저 정보를 찾을 수 없습니다.');
    }

    const { decryptedAccessToken, decryptedRefreshToken } = this.decryptTokens(
      user.group_id,
      user.access_token,
      user.refresh_token,
    );
    logger.info('샘플 유저 로그인');
    return { user, decryptedAccessToken, decryptedRefreshToken };
  }

  async createUser(userData: UserWithTokenDto) {
    const groupId = generateRandomGroupId();
    const newUser = await this.userRepo.createUser(
      userData.uuid,
      userData.email,
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
    return await this.userRepo.updateTokens(userData.uuid, userData.accessToken, userData.refreshToken);
  }

  async createUserQRToken(userId: number, ip: string, userAgent: string): Promise<string> {
    const token = generateRandomToken(10);
    await this.userRepo.createQRLoginToken(token, userId, ip, userAgent);
    return token;
  }

  async useToken(token: string): Promise<{ decryptedAccessToken: string; decryptedRefreshToken: string } | null> {
    // 1. 사용자의 토큰을 찾는다.
    const qrToken = await this.userRepo.findQRLoginToken(token);
    if (!qrToken) {
      return null;
    }

    // 2. 찾은 토큰을 기반으로 사용자를 다시 찾는다. (토큰 획득 및 사용자의 QR토큰 모두 비활성화)
    const qrTokenUser = await this.userRepo.findByUserId(qrToken.user_id);
    if (!qrTokenUser) {
      return null;
    }

    await this.userRepo.updateQRLoginTokenToUse(qrToken.user_id);
    const { decryptedAccessToken, decryptedRefreshToken } = this.decryptTokens(
      qrTokenUser.group_id,
      qrTokenUser.access_token,
      qrTokenUser.refresh_token,
    );
    return { decryptedAccessToken, decryptedRefreshToken };
  }
}
