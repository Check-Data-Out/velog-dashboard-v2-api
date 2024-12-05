import express, { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { UserRepository } from '../reposities/user.repository';
import { UserService } from '../services/user.service';
import pool from '../configs/db.config';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateResponse } from '../middlewares/validation.middleware';

import dotenv from 'dotenv';
import { VelogUserLoginDto } from 'src/types/dto/velog-user.dto';

const router: Router = express.Router();
dotenv.config();

const userRepository = new UserRepository(pool);
const userService = new UserService(userRepository);
const userController = new UserController(userService);

router.post('/login', authMiddleware.login, validateResponse(VelogUserLoginDto), userController.login);

export default router;
