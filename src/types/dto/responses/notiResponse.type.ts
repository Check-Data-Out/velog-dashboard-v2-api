import { BaseResponseDto } from '@/types/dto/responses/baseResponse.type';
import { NotiPost } from '@/types/models/NotiPost.type';

interface NotiPostsResponseData {
    posts: NotiPost[];
}

export class NotiPostsResponseDto extends BaseResponseDto<NotiPostsResponseData> { }