import { NextFunction, Request, RequestHandler, Response } from "express";
import logger from '@/configs/logger.config'
import { GetSvgBadgeParams, GetSvgBadgeQuery } from "@/types";
import { SvgService } from '@/services/svg.service';

export class SvgController {
    constructor(private svgService: SvgService) {}

    getSvgBadge: RequestHandler<GetSvgBadgeParams, any, any, GetSvgBadgeQuery> = async (
        req: Request<GetSvgBadgeParams, object, object, GetSvgBadgeQuery>,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const { username } = req.params;
            const { type = 'default', assets = 'views,likes,posts', withrank = 'false'} = req.query;

            const svgString = await this.svgService.generateBadgeSvg(
                username,
                type,
                assets,
                withrank === 'true',
            );

            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=1800');
            res.send(svgString);
        } catch (error) {
            logger.error('SVG Badge 생성 실패: ', error);
            next(error);
        }
    }
}
