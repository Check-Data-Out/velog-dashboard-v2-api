import { IsISO8601, IsNotEmpty } from 'class-validator';

export class StayTimeRequestDto {
  @IsISO8601()
  @IsNotEmpty()
  loadDate: Date;

  @IsISO8601()
  @IsNotEmpty()
  unloadDate: Date;

  constructor(loadDate: Date, unloadDate: Date) {
    this.loadDate = loadDate;
    this.unloadDate = unloadDate;
  }
}
