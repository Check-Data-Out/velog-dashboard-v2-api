import { UserEventType } from '@/types/userEvent.type';

export interface UserEventTracking {
  id: number;
  type: UserEventType;
  user_id: number;
  created_at: Date;
}
