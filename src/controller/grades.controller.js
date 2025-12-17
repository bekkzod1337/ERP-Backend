/**
 * @swagger
 * tags:
 *   name: Grades
 *   description: Kurs baholarini boshqarish
 */

/**
 * @swagger
 * /grades/{courseId}:
 *   get:
 *     summary: Kurs bo‘yicha barcha baholarni olish
 *     tags: [Grades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         description: Kurs ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Baholar ro‘yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 grades:
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
 *                       grade:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 */

/**
 * @swagger
 * /grades:
 *   post:
 *     summary: Yangi baho qo‘shish
 *     tags: [Grades]
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
 *               - grade
 *             properties:
 *               student_id:
 *                 type: integer
 *               course_id:
 *                 type: integer
 *               grade:
 *                 type: string
 *     responses:
 *       201:
 *         description: Baho qo‘shildi
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
 * /grades/{id}:
 *   put:
 *     summary: Baho yangilash
 *     tags: [Grades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Baho ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               grade:
 *                 type: string
 *     responses:
 *       200:
 *         description: Baho yangilandi
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
 * /grades/{id}:
 *   delete:
 *     summary: Baho o‘chirish
 *     tags: [Grades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Baho ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Baho o‘chirildi
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

import { Router } from "express";
import {
  getAllGrades,
  getGrade,
  addGrade,
  updateGrade,
  deleteGrade
} from "../core/grades/grades.service.js";
import { authenticateToken } from "../common/middleware/authenticateToken.js";
import { isAdmin } from "../common/middleware/isAdmin.js";

const gradesRouter = Router();

gradesRouter.use(authenticateToken);
// Bitta baho olish
gradesRouter.get("/item/:id", isAdmin, getGrade);
// Kurs bo‘yicha barcha baholarni olish
gradesRouter.get("/:courseId", getAllGrades);

// Yangi baho qo‘shish (admin va o‘qituvchi)
gradesRouter.post("/", isAdmin, addGrade);

// Baho yangilash (admin va o‘qituvchi)
gradesRouter.put("/:id", isAdmin, updateGrade);

// Baho o‘chirish (admin va o‘qituvchi)
gradesRouter.delete("/:id", isAdmin, deleteGrade);

export default gradesRouter;
