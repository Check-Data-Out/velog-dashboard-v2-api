import { IsEnum, IsOptional, IsString } from 'class-validator';

export type SvgBadgeType = 'default' | 'simple';

export interface GetSvgBadgeParams {
    username: string;
}

export interface GetSvgBadgeQuery {
    type?: SvgBadgeType;
}

export class GetSvgBadgeQueryDto {
    @IsOptional()
    @IsEnum(['default', 'simple'])
    type?: SvgBadgeType;

    constructor(type?: SvgBadgeType) {
        this.type = type || 'default';
    }
}
