import { UserRepository } from '../repositories/user.repository';

export class UserService {
  constructor(private userRepository: UserRepository) {}
}
