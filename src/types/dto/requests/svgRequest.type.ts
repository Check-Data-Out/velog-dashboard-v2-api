import { IsEnum, IsOptional, IsString } from 'class-validator';

export type SvgBadgeType = 'default' | 'simple';

export interface GetSvgBadgeParams {
    username: string;
}

export interface GetSvgBadgeQuery {
    type?: SvgBadgeType;
    assets?: string;
    withrank?: string;
}

export class GetSvgBadgeQueryDto {
    @IsOptional()
    @IsEnum(['default', 'simple'])
    type?: SvgBadgeType;

    @IsOptional()
    @IsString()
    assets?: string;

    @IsOptional()
    @IsEnum(['true', 'false'])
    withrank?: string;

    constructor(type?: SvgBadgeType, assets?: string, withrank?: string) {
        this.type = type || 'default';
        this.assets = assets || 'views,likes,posts'
        this.withrank = withrank || 'false';
    }
}
