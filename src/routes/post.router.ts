import express, { Router } from 'express';
import pool from '../configs/db.config';
import dotenv from 'dotenv';
import { authMiddleware } from '../middlewares/auth.middleware';
import { PostRepository } from '../repositories/post.repository';
import { PostService } from '../services/post.service';
import { PostController } from '../controllers/post.controller';
import { validateRequestDto } from 'src/middlewares/validation.middleware';
import { GetAllPostsQueryDto } from 'src/types/dto/requests/getAllPostsQuery.type';

const router: Router = express.Router();
dotenv.config();

const postRepository = new PostRepository(pool);
const postService = new PostService(postRepository);
const postController = new PostController(postService);

router.get(
  '/posts',
  authMiddleware.verify,
  validateRequestDto(GetAllPostsQueryDto, 'query'),
  postController.getAllPost,
);
router.get('/posts-stats', authMiddleware.verify, postController.getAllPostStatistics);
router.get('/post/:postId', authMiddleware.verify, postController.getPost);

export default router;
