import { Router } from "express";
import {
  getAllHomework,
  getHomework,
  getTopicHomework,
  addHomework,
  updateHomework,
  submitHomework,
  deleteHomework
} from "../core/homework/homework.service.js";
import { authenticateToken } from "../common/middleware/authenticateToken.js";
import { isAdmin } from "../common/middleware/isAdmin.js";

const homeworkRouter = Router();

homeworkRouter.use(authenticateToken);

// Barcha vazifalar
homeworkRouter.get("/", getAllHomework);

// Bitta vazifani olish
homeworkRouter.get("/item/:id", getHomework);

// Ma'lum topic uchun vazifalar
homeworkRouter.get("/topic/:topicId", getTopicHomework);

// Yangi vazifa qo'shish (o'qituvchi / admin)
homeworkRouter.post("/", addHomework);

// Vazifani yangilash (o'qituvchi / admin)
homeworkRouter.put("/:id", updateHomework);

// O‘quvchi vazifasini topshirish
homeworkRouter.put("/submit/:id", submitHomework);

// Vazifani o‘chirish (admin)
homeworkRouter.delete("/:id", isAdmin, deleteHomework);

export default homeworkRouter;
