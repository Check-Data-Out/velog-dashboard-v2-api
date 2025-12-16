import { NextFunction, RequestHandler, Request, Response } from "express";
import logger from '@/configs/logger.config'
import { GetSvgBadgeQuery, BadgeDataResponseDto } from "@/types";
import { SvgService } from '@/services/svg.service';

export class SvgController {
    constructor(private svgService: SvgService) {}

    getSvgBadge: RequestHandler<{ username: string }, BadgeDataResponseDto, object, GetSvgBadgeQuery> = async (
        req: Request<{ username: string }, BadgeDataResponseDto, object, GetSvgBadgeQuery>,
        res: Response<BadgeDataResponseDto>,
        next: NextFunction,
    ) => {
        try {
            const { username } = req.params;
            const { type = 'default'} = req.query;

            const data = await this.svgService.getBadgeData(username, type);
            const response = new BadgeDataResponseDto(true, '배지 데이터 조회에 성공하였습니다.', data, null);

            res.status(200).json(response);
        } catch (error) {
            logger.error('SVG Badge 조회 실패:', error);
            next(error);
        }
    }
}
