import { Router } from "express";
import {
  getAllAttendance,
  getAttendance,
  addAttendance,
  updateAttendance,
  deleteAttendance
} from "../core/attendance/attendance.service.js";
import { authenticateToken } from "../common/middleware/authenticateToken.js";
import { isAdmin } from "../common/middleware/isAdmin.js";

const attendanceRouter = Router();

attendanceRouter.use(authenticateToken);

// Specific route BEFORE dynamic route
// Bitta qatnashuvni olish (admin bilan)
attendanceRouter.get("/item/:id", isAdmin, getAttendance);

// Dynamic route - Kurs bo'yicha barcha qatnashuvlarni olish
attendanceRouter.get("/:courseId", getAllAttendance);

// POST - Yangi qatnashuv qo'shish (admin va o'qituvchi)
attendanceRouter.post("/", isAdmin, addAttendance);

// PUT - Qatnashuvni yangilash (admin va o'qituvchi)
attendanceRouter.put("/:id", isAdmin, updateAttendance);

// DELETE - Qatnashuvni o'chirish (admin va o'qituvchi)
attendanceRouter.delete("/:id", isAdmin, deleteAttendance);

export default attendanceRouter;
/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: Kurs qatnashuvlarini boshqarish
 */

/**
 * @swagger
 * /attendance/{courseId}:
 *   get:
 *     summary: Kurs bo‘yicha barcha qatnashuvlarni olish
 *     tags: [Attendance]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Kurs ID
 *     responses:
 *       200:
 *         description: Qatnashuvlar ro'yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 attendance:
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
 *                       status:
 *                         type: string
 *                       attended_at:
 *                         type: string
 *                         format: date-time
 */

/**
 * @swagger
 * /attendance:
 *   post:
 *     summary: Yangi qatnashuv qo‘shish
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Qatnashuv ma'lumotlari
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - student_id
 *               - course_id
 *               - status
 *             properties:
 *               student_id:
 *                 type: integer
 *               course_id:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [present, absent, late]
 *     responses:
 *       201:
 *         description: Qatnashuv qo‘shildi
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
 * /attendance/{id}:
 *   put:
 *     summary: Qatnashuvni yangilash
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Qatnashuv ID
 *     requestBody:
 *       description: Yangilangan qatnashuv ma'lumotlari
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [present, absent, late]
 *     responses:
 *       200:
 *         description: Qatnashuv yangilandi
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
 * /attendance/{id}:
 *   delete:
 *     summary: Qatnashuvni o‘chirish
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Qatnashuv ID
 *     responses:
 *       200:
 *         description: Qatnashuv o‘chirildi
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
