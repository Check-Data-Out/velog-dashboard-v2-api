export interface QRLoginToken {
    token: string;
    user: number;
    created_at: Date;
    expires_at: Date;
    is_used: boolean;
    ip_address: string;
    user_agent: string;
}