import { QRLoginTokenRepository } from "@/repositories/qr.repository";
import { QRLoginToken } from "@/types/models/QRLoginToken.type";
import { randomUUID } from "crypto";

export class QRLoginTokenService {
    constructor(private qrRepo: QRLoginTokenRepository) {}

    async create(userId: number, ip: string, userAgent: string): Promise<string> {
        const token = randomUUID();
        await this.qrRepo.createQRLoginToken(token, userId, ip, userAgent);
        return token;
    }

    async getByToken(token: string): Promise<QRLoginToken | null> {
        return await this.qrRepo.findQRLoginToken(token);
    }

    async useToken(token: string): Promise<QRLoginToken | null> {
        const qrToken = await this.qrRepo.findQRLoginToken(token);
      
        if (!qrToken) {
          return null;
        }
      
        await this.qrRepo.markTokenUsed(token);
        return qrToken;
      }
}
