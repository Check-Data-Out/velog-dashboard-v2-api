import { NotiRepository } from '@/repositories/noti.repository';
import { NotiPost } from '@/types/models/NotiPost.type';

export class NotiService {
  constructor(private notiRepo: NotiRepository) {}

  async getAllNotiPosts(): Promise<NotiPost[]> {
    return await this.notiRepo.getAllNotiPosts();
  }
}
