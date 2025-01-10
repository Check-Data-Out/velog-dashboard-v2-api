import express, { Router } from 'express';
import dotenv from 'dotenv';
import pool from '@/configs/db.config';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { PostRepository } from '@/repositories/post.repository';
import { PostService } from '@/services/post.service';
import { PostController } from '@/controllers/post.controller';
import { validateRequestDto } from '@/middlewares/validation.middleware';
import { GetAllPostsQueryDto } from '@/types/dto/requests/getAllPostsQuery.type';

const router: Router = express.Router();
dotenv.config();

const postRepository = new PostRepository(pool);
const postService = new PostService(postRepository);
const postController = new PostController(postService);

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: 게시물 목록 조회
 *     tags:
 *       - Post
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           $ref: '#/components/schemas/GetAllPostsQueryDto/properties/cursor'
 *       - in: query
 *         name: sort
 *         schema:
 *           $ref: '#/components/schemas/GetAllPostsQueryDto/properties/sort'
 *       - in: query
 *         name: asc
 *         schema:
 *           $ref: '#/components/schemas/GetAllPostsQueryDto/properties/asc'
 *     responses:
 *       '200':
 *         description: 게시물 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostsResponseDto'
 *       '500':
 *         description: 서버 오류 / 데이터 베이스 조회 오류
 */
router.get(
  '/posts',
  authMiddleware.verify,
  validateRequestDto(GetAllPostsQueryDto, 'query'),
  postController.getAllPost,
);

/**
 * @swagger
 * /posts-stats:
 *   get:
 *     summary: 게시물 전체 통계 조회
 *     tags:
 *       - Post
 *     responses:
 *       '200':
 *         description: 게시물 전체 통계 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostStatisticsResponseDto'
 *       '500':
 *         description: 서버 오류 / 데이터 베이스 조회 오류
 */
router.get('/posts-stats', authMiddleware.verify, postController.getAllPostStatistics);

/**
 * @swagger
 * /post/{postId}:
 *   get:
 *     summary: 게시물 상세 조회
 *     tags:
 *       - Post
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 조회할 게시물 ID
 *       - in: query
 *         name: start
 *         schema:
 *           $ref: '#/components/schemas/GetPostQueryDto/properties/start'
 *       - in: query
 *         name: end
 *         schema:
 *           $ref: '#/components/schemas/GetPostQueryDto/properties/end'
 *     responses:
 *       '200':
 *         description: 게시물 상세 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostResponseDto'
 *       '401':
 *         description: Post조회 실패 / Unauthorized
 *       '500':
 *         description: 서버 오류
 */
router.get('/post/velog/:postId', authMiddleware.verify, postController.getPostByUUID);
router.get('/post/:postId', authMiddleware.verify, postController.getPostByPostId);

export default router;
