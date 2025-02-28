import pool from '@/configs/db.config';
import { UserRepository } from '@/repositories/user.repository';
import { UserService } from '@/services/user.service';
import { UserWithTokenDto } from '@/types';
import { mock } from 'node:test';
import 'reflect-metadata';

describe('UserService 테스트', () => {
  let userService: UserService;
  let userRepository: UserRepository;

  beforeEach(() => {
    // userRepository 모킹
    userRepository = new UserRepository(pool);
    userService = new UserService(userRepository);
    jest.spyOn(userService, 'findByVelogUUID').mockResolvedValue({
      id: 1,
      velog_uuid: '1',
      access_token: 'accessToken',
      refresh_token: 'refreshToken',
      group_id: 1,
      email: 'test@test.com',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    jest
      .spyOn(userRepository, 'updateTokens')
      .mockImplementation((uuid: string, encryptedAccessToken: string, encryptedRefreshToken: string) => {
        return Promise.resolve({
          id: 1,
          velog_uuid: uuid,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          group_id: 1,
          email: 'test@test.com',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
      });
  });

  test('handleUserTokensByVelogUUID 메서드 테스트', async () => {
    const mockUserData: UserWithTokenDto = {
      id: '1',
      email: 'test@test.com',
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
    };

    const { id, email, accessToken, refreshToken } = mockUserData;

    let user = await userService.findByVelogUUID(id);
    if (!user) {
      user = await userService.createUser(mockUserData);
    }

    expect(user).toBeDefined();
    expect(user?.id).toBe(Number(id));
    expect(user?.email).toBe(email);
    expect(user?.access_token).toBe(accessToken);
    expect(user?.refresh_token).toBe(refreshToken);

    const { encryptedAccessToken, encryptedRefreshToken } = (userService as any).encryptTokens(
      user.group_id,
      accessToken,
      refreshToken,
    );

    const result = await userService.updateUserTokens({
      id,
      email,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
    });

    expect(result?.access_token).toBe(encryptedAccessToken);
    expect(result?.refresh_token).toBe(encryptedRefreshToken);
  });
});
