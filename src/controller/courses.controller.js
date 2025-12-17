import { Router } from 'express';
import {
  addCourse,
  deleteCourse,
  getAllCourse,
  getCourse,
  updateCourse
} from '../core/courses/courses.service.js';
import { authenticateToken } from '../common/middleware/authenticateToken.js';
import { isAdmin } from '../common/middleware/isAdmin.js';

const courseRouter = Router();

// Token orqali autentifikatsiya
courseRouter.use(authenticateToken);

// Barcha kurslarni olish
courseRouter.get("/", getAllCourse);

// Bitta kursni ID bo‘yicha olish
courseRouter.get("/:id", getCourse);

// Yangi kurs qo‘shish (faqat admin)
courseRouter.post("/", addCourse);

// Kursni yangilash (faqat admin)
courseRouter.put("/:id", updateCourse);

// Kursni o‘chirish (faqat admin)
courseRouter.delete("/:id", deleteCourse);

export default courseRouter;
