import { IsEnum, IsNotEmpty } from 'class-validator';

export enum UserEventType {
  LOGIN = '11', // 로그인 성공
  NAVIGATE = '12', // 페이지 이동 (헤더 클릭 등)
  LOGOUT = '13', // 로그아웃
  SECTION_INTERACT_MAIN = '21', // 메인 페이지 - 통계 블록 열림/닫힘
  SORT_INTERACT_MAIN = '22', // 메인 페이지 - 정렬(오름차순, 방식) 선택
  REFRESH_INTERACT_MAIN = '23', // 메인 페이지 - 새로고침 버튼
  SORT_INTERACT_BOARD = '31', // 리더보드 페이지 - 정렬 방식 선택
  NOTHING = '99',
}

export class EventRequestDto {
  @IsEnum(UserEventType)
  @IsNotEmpty()
  eventType: UserEventType;

  constructor(eventType: UserEventType) {
    this.eventType = eventType;
  }
}
