import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserEventType } from '../../userEvent.type';

export class EventRequestDto {
  @IsEnum(UserEventType)
  @IsNotEmpty()
  eventType: UserEventType;

  constructor(eventType: UserEventType) {
    this.eventType = eventType;
  }
}
