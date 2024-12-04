import express, { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { UserRepository } from '../reposities/user.repository';
import { UserService } from '../services/user.service';
import pool from '../configs/db.config';
import { authMiddleware } from 'src/middlewares/auth.middleware';
import { validateResponse } from 'src/middlewares/validation.middleware';
import { VelogUserLoginResponseDTO, VelogUserVerifyResponseDto } from 'src/types/dto/velog-user.dto';

import dotenv from 'dotenv';

const router: Router = express.Router();
dotenv.config();

const userRepository = new UserRepository(pool);
const userService = new UserService(userRepository);
const userController = new UserController(userService);

router.post('/login', authMiddleware.login, validateResponse(VelogUserLoginResponseDTO), userController.login);
router.post('/verify', authMiddleware.verify, validateResponse(VelogUserVerifyResponseDto), userController.verify);

export default router;
