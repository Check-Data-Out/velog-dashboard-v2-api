import { UserRepository } from 'src/reposities/user.repository';

export class UserService {
  constructor(private userRepository: UserRepository) {}
}
