import { Router } from "express";
import {
  getAllStatistics,
  getStatistic,
  getStudentStatistics,
  addStatistics,
  updateStatistics,
  deleteStatistics
} from "../core/statistics/statistics.service.js";
import { authenticateToken } from "../common/middleware/authenticateToken.js";
import { isAdmin } from "../common/middleware/isAdmin.js";

const statisticsRouter = Router();

// Foydalanuvchi tizimga kirishi kerak
statisticsRouter.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Statistics
 *   description: Kurs va o‘quvchi statistikalarini boshqarish
 */

/**
 * @swagger
 * /statistics:
 *   get:
 *     summary: Barcha statistikani olish
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistika ro‘yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statistics:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       student_id:
 *                         type: integer
 *                       course_id:
 *                         type: integer
 *                       score:
 *                         type: number
 *                       created_at:
 *                         type: string
 *                         format: date-time
 */

/**
 * @swagger
 * /statistics/student/{studentId}:
 *   get:
 *     summary: O‘quvchi bo‘yicha statistika
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: O‘quvchi ID
 *     responses:
 *       200:
 *         description: O‘quvchi statistikasi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statistics:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       course_id:
 *                         type: integer
 *                       score:
 *                         type: number
 *                       created_at:
 *                         type: string
 *                         format: date-time
 */

/**
 * @swagger
 * /statistics:
 *   post:
 *     summary: Yangi statistika qo‘shish
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - student_id
 *               - course_id
 *               - score
 *             properties:
 *               student_id:
 *                 type: integer
 *               course_id:
 *                 type: integer
 *               score:
 *                 type: number
 *     responses:
 *       201:
 *         description: Statistika qo‘shildi
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
 * /statistics/{id}:
 *   put:
 *     summary: Statistkani yangilash
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Statistika ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               score:
 *                 type: number
 *     responses:
 *       200:
 *         description: Statistika yangilandi
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
 * /statistics/{id}:
 *   delete:
 *     summary: Statistkani o‘chirish
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Statistika ID
 *     responses:
 *       200:
 *         description: Statistika o‘chirildi
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
statisticsRouter.get("/", getAllStatistics);
statisticsRouter.get("/item/:id", getStatistic);
statisticsRouter.get("/student/:studentId", getStudentStatistics);
statisticsRouter.post("/", addStatistics);
statisticsRouter.put("/:id", isAdmin, updateStatistics);
statisticsRouter.delete("/:id", isAdmin, deleteStatistics);

export default statisticsRouter;
