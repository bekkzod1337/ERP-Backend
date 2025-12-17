/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Foydalanuvchi xabarlarini boshqarish
 */

/**
 * @swagger
 * /notifications/{userId}:
 *   get:
 *     summary: Foydalanuvchining barcha xabarlarini olish
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: Foydalanuvchi ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xabarlar ro‘yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       user_id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       message:
 *                         type: string
 *                       read:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                         format: date-time
 */

/**
 * @swagger
 * /notifications:
 *   post:
 *     summary: Yangi xabar qo‘shish (faqat admin)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - title
 *               - message
 *             properties:
 *               user_id:
 *                 type: integer
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Xabar qo‘shildi
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
 * /notifications/{id}:
 *   delete:
 *     summary: Xabarni o‘chirish (faqat admin)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Xabar ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xabar o‘chirildi
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
 * /notifications/read/{id}:
 *   put:
 *     summary: Xabarni o‘qilgan deb belgilash
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Xabar ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xabar o‘qilgan deb belgilandi
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
  getAllNotifications,
  getNotification,
  addNotification,
  updateNotification,
  deleteNotification,
  markAsRead,
  getNotifications
} from "../core/notifications/notification.service.js";
import { authenticateToken } from "../common/middleware/authenticateToken.js";
import { isAdmin } from "../common/middleware/isAdmin.js";

const notificationRouter = Router();

notificationRouter.use(authenticateToken);

// GET - Barcha xabarlar (admin faqat)
notificationRouter.get("/", getNotifications);

// Specific routes BEFORE dynamic routes
// Bitta xabarni olish
notificationRouter.get("/item/:id", getNotification);

// Xabarni o'qilgan deb belgilash
notificationRouter.put("/read/:id", markAsRead);

// Dynamic route - Foydalanuvchining barcha xabarlari
notificationRouter.get("/:userId", getAllNotifications);

// POST - Yangi xabar qo'shish (faqat admin)
notificationRouter.post("/", addNotification);

// PUT - Xabar holatini yangilash (is_read)
notificationRouter.put("/:id", isAdmin, updateNotification);

// DELETE - Xabarni o'chirish (faqat admin)
notificationRouter.delete("/:id", isAdmin, deleteNotification);

export default notificationRouter;
