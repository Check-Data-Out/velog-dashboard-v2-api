import { IsEnum, IsNotEmpty } from 'class-validator';

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