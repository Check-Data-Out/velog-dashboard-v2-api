import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';
import { SlackPermissionsData } from '@/types/models/Slack.type';

export class PermissionCheckResponseDto extends BaseResponseDto<SlackPermissionsData> {}

export class SlackSuccessResponseDto extends BaseResponseDto<Record<string, unknown>> {} 