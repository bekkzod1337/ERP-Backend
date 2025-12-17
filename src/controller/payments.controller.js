/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: To‘lovlar bilan ishlash
 */

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: Barcha to‘lovlarni olish (faqat admin)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: To‘lovlar ro‘yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 payments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       student_id:
 *                         type: integer
 *                       amount:
 *                         type: number
 *                       paid_at:
 *                         type: string
 *                         format: date-time
 */

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     summary: Bitta to‘lovni olish
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: To‘lov ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: To‘lov ma’lumotlari
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 payment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     student_id:
 *                       type: integer
 *                     amount:
 *                       type: number
 *                     paid_at:
 *                       type: string
 *                       format: date-time
 */

/**
 * @swagger
 * /payments:
 *   post:
 *     summary: Yangi to‘lov qo‘shish (faqat admin)
 *     tags: [Payments]
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
 *               - amount
 *             properties:
 *               student_id:
 *                 type: integer
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: To‘lov qo‘shildi
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
 * /payments/{id}:
 *   delete:
 *     summary: To‘lovni o‘chirish (faqat admin)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: To‘lov ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: To‘lov o‘chirildi
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
 * /payments/student/{student_id}:
 *   get:
 *     summary: O‘quvchining barcha to‘lovlarini olish
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: student_id
 *         required: true
 *         description: O‘quvchi ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: To‘lovlar ro‘yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 payments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       student_id:
 *                         type: integer
 *                       amount:
 *                         type: number
 *                       paid_at:
 *                         type: string
 *                         format: date-time
 */

import { Router } from "express";

import { authenticateToken } from "../common/middleware/authenticateToken.js";
import { isAdmin } from "../common/middleware/isAdmin.js";
import { addPayment, deletePayment, getAllPayments, getPayment, getPaymentsByStudent, updatePayment } from "../core/payment/payment.service.js";

const paymentRouter = Router();

paymentRouter.use(authenticateToken);

// Barcha to‘lovlar (faqat admin)
paymentRouter.get("/", getAllPayments);

// O'quvchining barcha to'lovlari (specific route BEFORE dynamic)
paymentRouter.get("/student/:student_id", getPaymentsByStudent);

// Bitta to'lov
paymentRouter.get("/:id", getPayment);

// Yangi to'lov qo'shish (faqat admin)
paymentRouter.post("/", addPayment);

// To'lovni yangilash
paymentRouter.put("/:id", updatePayment);

// To'lovni o'chirish (faqat admin)
paymentRouter.delete("/:id", deletePayment);

export default paymentRouter;
