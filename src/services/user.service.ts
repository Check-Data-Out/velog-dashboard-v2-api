import logger from '../configs/logger.config';
import { TokenError } from '../exception/';
import { getKeyByGroup } from '../utils/key.util';
import AESEncryption from '../modules/token_encryption/aes_encryption';
import { UserRepository } from '../repositories/user.repository';
import { UserWithTokenDto, User } from '../types';

export class UserService {
  constructor(private userRepo: UserRepository) {}

  // 토큰 암호화 처리
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
      logger.error('유저 토큰 생성 중 오류 발생', error);
      throw new TokenError('토큰 암호화 처리에 실패하였습니다.');
    }
  }

  // 토큰 복호화 처리
  // private decryptTokens(refreshToken: string) {
  //   return {
  //     decryptedRefreshToken: this.aesEncryption.decrypt(refreshToken),
  //   };
  // }

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
      logger.error('유저 토큰 처리 중 오류 발생', error);
      throw error;
    }
  }

  async findByVelogUUID(uuid: string): Promise<User | null> {
    return await this.userRepo.findByUserVelogUUID(uuid);
  }

  async createUser(userData: UserWithTokenDto) {
    return await this.userRepo.createUser(userData.id, userData.email, userData.accessToken, userData.refreshToken);
  }

  async updateUserTokens(userData: UserWithTokenDto) {
    return await this.userRepo.updateTokens(userData.id, userData.accessToken, userData.refreshToken);
  }
}
