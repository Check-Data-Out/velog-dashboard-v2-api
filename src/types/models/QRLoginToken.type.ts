export interface QRLoginToken {
    token: string;
    user: number;
    is_used: boolean;
    ip_address: string;
    user_agent: string;
    created_at: Date;
    expires_at: Date;
}
