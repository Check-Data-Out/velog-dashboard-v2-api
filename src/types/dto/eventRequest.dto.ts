import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserEventType } from '../userEvent.type';

export class EventRequestDto {
  @IsEnum(UserEventType)
  @IsNotEmpty()
  type: UserEventType;

  constructor(type: UserEventType) {
    this.type = type;
  }
}
