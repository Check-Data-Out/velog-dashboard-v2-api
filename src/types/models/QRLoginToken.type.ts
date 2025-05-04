export interface QRLoginToken {
    id: number;
    token: string;
    user_id: number;
    is_used: boolean;
    ip_address: string;
    user_agent: string;
    expires_at: Date;
    created_at: Date;
}
