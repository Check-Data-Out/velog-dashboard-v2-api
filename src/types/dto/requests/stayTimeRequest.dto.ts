import { IsISO8601, IsNotEmpty } from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     StayTimeRequestDto:
 *       type: object
 *       required:
 *         - loadDate
 *         - unloadDate
 *       properties:
 *         loadDate:
 *          type: string
 *          format: date-time
 *          description: 시작 날짜
 *          example: '2024-01-01'
 *         unloadDate:
 *          type: string
 *          format: date-time
 *          description: 종료 날짜
 *          example: '2024-01-03'
 */
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
