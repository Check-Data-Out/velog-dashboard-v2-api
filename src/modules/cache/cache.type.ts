/**
 * 캐시 설정 옵션입니다.
 *
 * @property host 캐시 서버의 호스트명 또는 IP 주소
 * @property port 캐시 서버의 포트 번호
 * @property [password] 캐시 서버 인증 비밀번호(선택)
 * @property [db] 사용할 데이터베이스 인덱스(선택)
 * @property [keyPrefix] 모든 키에 붙일 접두사(선택)
 * @property [defaultTTL] 기본 만료 시간(초, 선택)
 */
export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  defaultTTL?: number;
}

/**
 * 캐시 서비스 인터페이스입니다.
 */
export interface ICache {
  /**
   * 키로부터 값을 가져옵니다.
   * @param key 값을 가져올 키
   * @returns 값을 반환하거나 없으면 null을 반환합니다.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * 값을 캐시에 저장합니다.
   * @param key 저장할 키
   * @param value 저장할 값
   * @param ttlSeconds 값의 만료 시간(초, 선택)
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * 키에 해당하는 값을 삭제합니다.
   * @param key 삭제할 키
   * @returns 삭제 성공 여부를 반환합니다.
   */
  delete(key: string): Promise<boolean>;

  /**
   * 키가 존재하는지 확인합니다.
   * @param key 확인할 키
   * @returns 존재하면 true, 아니면 false를 반환합니다.
   */
  exists(key: string): Promise<boolean>;

  /**
   * 캐시를 비웁니다. 패턴이 있으면 해당 키만 비웁니다.
   * @param pattern 비울 키의 패턴(선택)
   */
  clear(pattern?: string): Promise<void>;

  /**
   * 캐시에 저장된 항목 개수를 반환합니다.
   * @returns 항목 개수
   */
  size(): Promise<number>;

  /**
   * 캐시 서버에 연결합니다.
   */
  connect(): Promise<void>;

  /**
   * 캐시 서버와 연결을 끊습니다.
   */
  destroy(): Promise<void>;

  /**
   * 캐시 서버와 연결되어 있는지 확인합니다.
   * @returns 연결되어 있으면 true, 아니면 false
   */
  isConnected(): boolean;
}