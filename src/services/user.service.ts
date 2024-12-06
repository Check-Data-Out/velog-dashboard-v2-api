import { getKeyByGroup } from '../utils/key.urtil';
import AESEncryption from '../modules/token_encryption/aes_encryption';
import { UserRepository } from '../reposities/user.repository';

import { UserWithTokenDto } from '../types/dto/user-with-token.dto';
import { User } from 'src/types';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  // 토큰 암호화 처리
  private encryptTokens(groupId: number, accessToken: string, refreshToken: string) {
    const key = getKeyByGroup(groupId);
    const aes = new AESEncryption(key);

    return {
      encryptedAccessToken: aes.encrypt(accessToken),
      encryptedRefreshToken: aes.encrypt(refreshToken),
    };
  }

  // 토큰 복호화 처리
  // private decryptTokens(refreshToken: string) {
  //   return {
  //     decryptedRefreshToken: this.aesEncryption.decrypt(refreshToken),
  //   };
  // }

  async handleUserTokensByVelogUUID(userData: UserWithTokenDto) {
    const { id, email, accessToken, refreshToken } = userData;

    const existingUser = await this.findByVelogUUID(id);

    if (!existingUser) {
      const createdUser = await this.createUser({
        id,
        email,
        accessToken,
        refreshToken,
      });

      const { encryptedAccessToken, encryptedRefreshToken } = this.encryptTokens(
        createdUser.group_id,
        accessToken,
        refreshToken,
      );

      return await this.updateUserTokens({
        id,
        email,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
      });
    }

    const { encryptedAccessToken, encryptedRefreshToken } = this.encryptTokens(
      existingUser.group_id,
      accessToken,
      refreshToken,
    );

    return await this.updateUserTokens({
      id,
      email,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
    });
  }

  async findByVelogUUID(uuid: string): Promise<User | null> {
    return await this.userRepository.findByUserVelogUUID(uuid);
  }

  async createUser(userData: UserWithTokenDto) {
    return await this.userRepository.createUser(
      userData.id,
      userData.email,
      userData.accessToken,
      userData.refreshToken,
    );
  }

  async updateUserTokens(userData: UserWithTokenDto) {
    return this.userRepository.updateTokens(userData.id, userData.accessToken, userData.refreshToken);
  }
}
