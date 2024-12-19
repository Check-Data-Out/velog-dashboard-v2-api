import express, { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { UserRepository } from '../repositories/user.repository';
import { UserService } from '../services/user.service';
import pool from '../configs/db.config';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateDto } from '../middlewares/validation.middleware';
import dotenv from 'dotenv';
import { VelogUserLoginDto } from '../types';

const router: Router = express.Router();
dotenv.config();

const userRepository = new UserRepository(pool);
const userService = new UserService(userRepository);
const userController = new UserController(userService);

router.post('/login', authMiddleware.login, validateDto(VelogUserLoginDto, 'user'), userController.login);

export default router;
