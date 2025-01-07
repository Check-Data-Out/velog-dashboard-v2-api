import { IsEnum, IsNotEmpty } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     UserEventType:
 *       type: string
 *       enum: ['01', '02', '03', '04', '99']
 *       description: |
 *         사용자 이벤트 타입 코드
 *         * '01' - 로그인
 *         * '02' - 포스트 클릭
 *         * '03' - 포스트 그래프 클릭
 *         * '04' - 종료
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
  LOGIN = '01',
  POST_CLICK = '02',
  POST_GRAPH_CLICK = '03',
  EXIT = '04',
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
