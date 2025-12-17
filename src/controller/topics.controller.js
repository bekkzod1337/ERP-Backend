import { Router } from "express";
import {
  getAllTopics,
  getTopic,
  getCourseTopics,
  addTopic,
  updateTopic,
  deleteTopic
} from "../core/topics/topics.service.js";
import { authenticateToken } from "../common/middleware/authenticateToken.js";
import { isAdmin } from "../common/middleware/isAdmin.js";

const topicsRouter = Router();

// Foydalanuvchi tizimga kirishi kerak
topicsRouter.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Topics
 *   description: Kurs mavzularini boshqarish
 */

/**
 * @swagger
 * /topics:
 *   get:
 *     summary: Barcha mavzularni olish
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mavzular ro‘yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 topics:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       course_id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 */

/**
 * @swagger
 * /topics/course/{courseId}:
 *   get:
 *     summary: Kursga tegishli mavzular
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Kurs ID
 *     responses:
 *       200:
 *         description: Kurs mavzulari
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 topics:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 */

/**
 * @swagger
 * /topics:
 *   post:
 *     summary: Yangi mavzu qo‘shish
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - course_id
 *               - title
 *             properties:
 *               course_id:
 *                 type: integer
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Mavzu qo‘shildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /topics/{id}:
 *   put:
 *     summary: Mavzuni yangilash
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mavzu ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mavzu yangilandi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /topics/{id}:
 *   delete:
 *     summary: Mavzuni o‘chirish
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mavzu ID
 *     responses:
 *       200:
 *         description: Mavzu o‘chirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

// Routes
topicsRouter.get("/", getAllTopics);
topicsRouter.get("/item/:id", getTopic);
topicsRouter.get("/course/:courseId", getCourseTopics);
topicsRouter.post("/", isAdmin, addTopic);
topicsRouter.put("/:id", isAdmin, updateTopic);
topicsRouter.delete("/:id", isAdmin, deleteTopic);

export default topicsRouter;
