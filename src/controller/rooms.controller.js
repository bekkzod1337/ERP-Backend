import { Router } from 'express';
import { addRoom, deleteRoom, getAllRooms, getRoomById, updateRoom } from '../core/rooms/rooms.service.js';
import { authenticateToken } from '../common/middleware/authenticateToken.js';
import { isAdmin } from '../common/middleware/isAdmin.js';

const roomRouter = Router();

// Foydalanuvchi tizimga kirishi kerak
roomRouter.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Xonalar bilan ishlash
 */

/**
 * @swagger
 * /rooms:
 *   get:
 *     summary: Barcha xonalarni olish
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xonalar ro‘yxati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 rooms:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       capacity:
 *                         type: integer
 */

/**
 * @swagger
 * /rooms:
 *   post:
 *     summary: Yangi xona qo‘shish (faqat admin)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - capacity
 *             properties:
 *               name:
 *                 type: string
 *               capacity:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Yangi xona qo‘shildi
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

// Barcha xonalarni olish
roomRouter.get("/", getAllRooms);
roomRouter.get("/:id", getRoomById);

// Yangi xona qo‘shish (faqat admin)
roomRouter.post("/", isAdmin, addRoom);
roomRouter.put("/:id", isAdmin, updateRoom);
roomRouter.delete("/:id", isAdmin, deleteRoom);
export default roomRouter;
