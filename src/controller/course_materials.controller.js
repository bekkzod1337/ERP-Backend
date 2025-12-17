/**
 * @swagger
 * tags:
 *   name: Materials
 *   description: Kurs materiallarini boshqarish
 */

/**
 * @swagger
 * /materials/{courseId}:
 *   get:
 *     summary: Kurs bo‘yicha barcha materiallarni olish
 *     tags: [Materials]
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
 *         description: Materiallar ro‘yxati
 */

/**
 * @swagger
 * /materials:
 *   post:
 *     summary: Yangi material qo‘shish
 *     tags: [Materials]
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
 *               - file_url
 *             properties:
 *               course_id:
 *                 type: integer
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               file_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Material qo‘shildi
 */

/**
 * @swagger
 * /materials/{id}:
 *   delete:
 *     summary: Materialni o‘chirish
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Material o‘chirildi
 */

/**
 * @swagger
 * /materials/{id}:
 *   put:
 *     summary: Materialni yangilash
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
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
 *               file_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Material yangilandi
 */

import { Router } from "express";
import {
  getAllMaterials,
  getMaterial,
  addMaterial,
  deleteMaterial,
  updateMaterial
} from "../core/course_materials/course_materials.service.js";
import { authenticateToken } from "../common/middleware/authenticateToken.js";
import { isAdmin } from "../common/middleware/isAdmin.js";

const materialsRouter = Router();

materialsRouter.use(authenticateToken);

// Specific route BEFORE dynamic route
// Bitta materialni olish
materialsRouter.get("/item/:id", getMaterial);

// Dynamic route - Kurs bo'yicha barcha materiallar
materialsRouter.get("/:courseId", getAllMaterials);

// POST - Yangi material qo'shish
materialsRouter.post("/", isAdmin, addMaterial);

// PUT - Materialni yangilash
materialsRouter.put("/:id", isAdmin, updateMaterial);

// DELETE - Materialni o'chirish
materialsRouter.delete("/:id", isAdmin, deleteMaterial);

export default materialsRouter;
