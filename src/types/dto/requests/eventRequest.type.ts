import { IsEnum, IsNotEmpty } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     UserEventType:
 *       type: string
 *       enum: ['11', '12', '13', '21', '22', '23', '31', '99']
 *       description: |
 *         사용자 이벤트 타입 코드
 *         * '11' - 로그인 성공
 *         * '12' - 페이지 이동
 *         * '13' - 로그아웃
 *         * '21' - 메인 페이지 - 통계 블록 열림/닫힘
 *         * '22' - 메인 페이지 - 정렬(오름차순, 방식) 선택
 *         * '23' - 메인 페이지 - 새로고침 버튼
 *         * '31' - 리더보드 페이지 - 정렬 방식 선택
 *         * '99' - 해당 없음
 *     EventRequestDto:
 *       type: object
 *       required:
 *         - eventType
 *       properties:
 *         eventType:
 *           $ref: '#/components/schemas/UserEventType'
 *       example:
 *         eventType: '01'
 */
export enum UserEventType {
  LOGIN = '11',
  NAVIGATE = '12',
  LOGOUT = '13',
  SECTION_INTERACT_MAIN = '21',
  SORT_INTERACT_MAIN = '22',
  REFRESH_INTERACT_MAIN = '23',
  SORT_INTERACT_BOARD = '31',
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
