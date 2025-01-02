import { UserEventType } from '@/userEvent.type';

export interface UserEventTracking {
  id: number;
  type: UserEventType;
  user_id: number;
  created_at: Date;
}
