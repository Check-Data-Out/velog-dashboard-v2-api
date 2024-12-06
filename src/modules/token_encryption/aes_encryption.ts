import crypto from 'crypto';

/**
 * AES 암호화/복호화 유틸리티 클래스
 * AES-256-CBC 알고리즘을 사용하여 데이터를 암호화하고 복호화합니다.
 */
class AESEncryption {
  private readonly key: Buffer;

  /**
   * AES 암호화 클래스를 초기화합니다.
   * @param {string} key - 256비트(32바이트) 암호화 키
   * @throws {Error} 키가 256비트가 아닌 경우 예외를 발생시킵니다.
   */
  constructor(key: string) {
    if (key.length !== 32) {
      throw new Error('키는 256비트(32바이트)여야 합니다.');
    }
    this.key = Buffer.from(key, 'utf-8');
  }

  /**
   * 주어진 문자열을 AES-256-CBC 알고리즘으로 암호화합니다.
   * @param {string} plaintext - 암호화할 문자열
   * @returns {string} base64로 인코딩된 암호화 데이터
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16); // 16바이트 IV 생성
    const cipher = crypto.createCipheriv('aes-256-cbc', this.key, iv);

    // PKCS7 패딩은 node 에서 자동 처리
    const encrypted = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf-8')), cipher.final()]);

    // IV와 암호화된 데이터를 결합하여 base64로 반환
    return Buffer.concat([iv, encrypted]).toString('base64');
  }

  /**
   * AES-256-CBC 알고리즘으로 암호화된 데이터를 복호화합니다.
   * @param {string} encryptedData - base64로 인코딩된 암호화 데이터
   * @returns {string} 복호화된 문자열
   */
  decrypt(encryptedData: string): string {
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    const iv = encryptedBuffer.slice(0, 16); // 암호화 데이터에서 IV 추출
    const encryptedContent = encryptedBuffer.slice(16); // 암호화된 본문 추출

    const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, iv);

    // 복호화된 데이터를 반환
    const decrypted = Buffer.concat([decipher.update(encryptedContent), decipher.final()]);

    return decrypted.toString('utf-8');
  }
}

export default AESEncryption;
