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

    jest.spyOn(userService as any, 'encryptTokens').mockReturnValue({
      encryptedAccessToken: 'encryptedAccessToken',
      encryptedRefreshToken: 'encryptedRefreshToken',
    });

    // userRepository의 createUser모킹하기
    jest.spyOn(userRepository, 'createUser').mockImplementation(() => {});
  });

  test('handleUserTokensByVelogUUID - 기존 사용자 토큰 업데이트', async () => {
    // 사용자가 존재하는 경우 테스트
    const mockUserData: UserWithTokenDto = {
      id: '1',
      email: 'test@test.com',
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
    };

    const result = await userService.handleUserTokensByVelogUUID(mockUserData);

    expect(result).toBeDefined();
    expect(userService.findByVelogUUID).toHaveBeenCalledWith('1');
    expect((userService as any).encryptTokens).toHaveBeenCalled();
    expect(userRepository.updateTokens).toHaveBeenCalledWith('1', 'encryptedAccessToken', 'encryptedRefreshToken');
  });

  test('handleUserTokensByVelogUUID - 새 사용자 생성', async () => {
    // findByVelogUUID가 null 반환하도록 재설정
    jest.spyOn(userService, 'findByVelogUUID').mockResolvedValueOnce(null);

    const mockUserData: UserWithTokenDto = {
      id: '1',
      email: 'test@test.com',
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
    };

    const result = await userService.handleUserTokensByVelogUUID(mockUserData);

    expect(result).toBeDefined();
    expect(userService.findByVelogUUID).toHaveBeenCalledWith('1');
    expect(userService.createUser).toHaveBeenCalledWith(mockUserData);
    expect((userService as any).encryptTokens).toHaveBeenCalled();
    expect(userRepository.updateTokens).toHaveBeenCalled();
  });

  test('handleUserTokensByVelogUUID - 에러 처리', async () => {
    jest.spyOn(userService, 'findByVelogUUID').mockRejectedValueOnce(new Error('DB 에러'));

    const mockUserData: UserWithTokenDto = {
      id: '1',
      email: 'test@test.com',
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
    };

    await expect(userService.handleUserTokensByVelogUUID(mockUserData)).rejects.toThrow();
  });

  test('findSampleUser 메서드 테스트', async () => {
    jest.spyOn(userRepository, 'findSampleUser').mockResolvedValue({
      id: 1,
      velog_uuid: '1',
      access_token: 'encryptedAccessToken',
      refresh_token: 'encryptedRefreshToken',
      group_id: 1,
      email: 'test@test.com',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    jest.spyOn(userService as any, 'decryptTokens').mockReturnValue({
      decryptedAccessToken: 'decryptedAccessToken',
      decryptedRefreshToken: 'decryptedRefreshToken',
    });

    const result = await userService.findSampleUser();

    expect(result).toBeDefined();
    expect(result.decryptedAccessToken).toBe('decryptedAccessToken');
    expect(result.decryptedRefreshToken).toBe('decryptedRefreshToken');
    expect(userRepository.findSampleUser).toHaveBeenCalled();
    expect((userService as any).decryptTokens).toHaveBeenCalled();
  });
});
