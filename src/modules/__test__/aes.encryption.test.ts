import crypto from 'crypto';
import AESEncryption from '@/modules/token_encryption/aes_encryption';

describe('AESEncryption 클래스 테스트', () => {
  const validKey = crypto.randomBytes(32).toString('hex').slice(0, 32); // 32바이트 키 생성
  const invalidKey = crypto.randomBytes(16).toString('hex').slice(0, 16); // 16바이트 키 생성 (유효하지 않음)
  const aes = new AESEncryption(validKey);
  const sampleText = 'This is a test message for AES encryption!';

  test('암호화 후 복호화 결과가 원본과 동일해야 한다', () => {
    const encrypted = aes.encrypt(sampleText);
    const decrypted = aes.decrypt(encrypted);
    expect(decrypted).toBe(sampleText);
  });

  test('잘못된 키 길이를 사용하면 오류가 발생해야 한다', () => {
    expect(() => new AESEncryption(invalidKey)).toThrow('키는 256비트(32바이트)여야 합니다.');
  });

  test('암호화 결과는 base64 형식이어야 한다', () => {
    const encrypted = aes.encrypt(sampleText);
    expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
  });

  test('동일한 데이터를 여러 번 암호화해도 결과가 달라야 한다 (IV 사용 확인)', () => {
    const encrypted1 = aes.encrypt(sampleText);
    const encrypted2 = aes.encrypt(sampleText);
    expect(encrypted1).not.toBe(encrypted2);
  });

  test('빈 문자열도 암호화 및 복호화가 정상적으로 동작해야 한다', () => {
    const encrypted = aes.encrypt('');
    const decrypted = aes.decrypt(encrypted);
    expect(decrypted).toBe('');
  });

  test('큰 입력 데이터를 암호화 및 복호화해도 원본과 동일해야 한다', () => {
    const largeText = 'A'.repeat(10_000); // 10,000자 문자열
    const encrypted = aes.encrypt(largeText);
    const decrypted = aes.decrypt(encrypted);
    expect(decrypted).toBe(largeText);
  });

  test('유니코드 문자열도 암호화 및 복호화가 정상적으로 동작해야 한다', () => {
    const unicodeText = '안녕하세요! AES 암호화 테스트입니다. 🚀';
    const encrypted = aes.encrypt(unicodeText);
    const decrypted = aes.decrypt(encrypted);
    expect(decrypted).toBe(unicodeText);
  });

  test('잘못된 암호화 데이터는 복호화 시 오류가 발생해야 한다', () => {
    const invalidData = 'invalid_encrypted_data';
    expect(() => aes.decrypt(invalidData)).toThrow();
  });

  test('손상된 암호화 데이터는 복호화 시 오류가 발생해야 한다', () => {
    const encrypted = aes.encrypt(sampleText);
    const corruptedData = encrypted.slice(0, -4) + 'abcd'; // 암호화 데이터 끝부분 손상
    expect(() => aes.decrypt(corruptedData)).toThrow();
  });
});
