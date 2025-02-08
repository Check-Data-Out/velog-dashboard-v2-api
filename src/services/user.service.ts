import logger from '@/configs/logger.config';
import { TokenError } from '@/exception/';
import { getKeyByGroup } from '@/utils/key.util';
import AESEncryption from '@/modules/token_encryption/aes_encryption';
import { sendSlackMessage } from '@/modules/slack/slack.notifier';
import { UserRepository } from '@/repositories/user.repository';
import { UserWithTokenDto, User, SampleUser } from '@/types';
import { generateRandomGroupId } from '@/utils/generateGroupId.util';

export class UserService {
  constructor(private userRepo: UserRepository) { }

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

  async handleUserTokensByVelogUUID(userData: UserWithTokenDto) {
    const { id, email, accessToken, refreshToken } = userData;
    try {
      let user = await this.findByVelogUUID(id);

      if (!user) {
        user = await this.createUser({
          id,
          email,
          accessToken,
          refreshToken,
        });
      }

      const { encryptedAccessToken, encryptedRefreshToken } = this.encryptTokens(
        user.group_id,
        accessToken,
        refreshToken,
      );

      return await this.updateUserTokens({
        id,
        email,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
      });
    } catch (error) {
      logger.error('User Service handleUserTokensByVelogUUID 중 오류 발생 : ', error);
      throw error;
    }
  }

  async findByVelogUUID(uuid: string): Promise<User | null> {
    return await this.userRepo.findByUserVelogUUID(uuid);
  }

  async findSampleUser(): Promise<SampleUser> {
    const user = await this.userRepo.findSampleUser();
    const { decryptedAccessToken, decryptedRefreshToken } = this.decryptTokens(
      user.group_id,
      user.access_token,
      user.refresh_token
    );

    return { user, decryptedAccessToken, decryptedRefreshToken };
  }

  async createUser(userData: UserWithTokenDto) {
    const groupId = generateRandomGroupId();
    const newUser = await this.userRepo.createUser(
      userData.id,
      userData.email,
      userData.accessToken,
      userData.refreshToken,
      groupId,
    );

    // 신규 유저 웹훅 알림
    await sendSlackMessage(`새로운 유저 등록: ${userData.id}, ${userData.email}`);
    return newUser;
  }

  async updateUserTokens(userData: UserWithTokenDto) {
    return await this.userRepo.updateTokens(userData.id, userData.accessToken, userData.refreshToken);
  }
}
