import crypto from "crypto"
import dotenv from "dotenv";
import { Request } from "express";

dotenv.config();

/**
 * Sentry 웹훅 요청의 시그니처 헤더를 검증합니다.
 * 
 * HMAC SHA256과 Sentry의 Client Secret를 사용하여 요청 본문을 해시화하고, 
 * 
 * Sentry에서 제공하는 시그니처 헤더와 비교하여 요청의 무결성을 확인합니다.
 * 
 * @param {Request} request - Express 요청 객체
 * @returns {boolean} 헤더가 유효하면 true, 그렇지 않으면 false
 * 
 * @example
 * ```typescript
 * const isValid = verifySignature(req, process.env.SENTRY_WEBHOOK_SECRET);
 * if (!isValid) {
 *   return res.status(401).json({ error: 'Invalid signature' });
 * }
 * ```
 */
export function verifySignature(request: Request) {
  if(!process.env.SENTRY_CLIENT_SECRET) throw new Error("SENTRY_CLIENT_SECRET is not defined");
  const hmac = crypto.createHmac("sha256", process.env.SENTRY_CLIENT_SECRET);
  hmac.update(JSON.stringify(request.body), "utf8");
  const digest = hmac.digest("hex");

  return digest === request.headers["sentry-hook-signature"];
}