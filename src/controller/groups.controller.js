import { Router } from "express";
import {
  getAllGroups,
  getCourseGroups,
  addGroup,
  updateGroup,
  deleteGroup,
  getTeacherGroups,
  getOneGroup
} from "../core/groups/groups.service.js";
import { authenticateToken } from "../common/middleware/authenticateToken.js";
import { isAdmin } from "../common/middleware/isAdmin.js";

const groupsRouter = Router();

// Token orqali autentifikatsiya
groupsRouter.use(authenticateToken);

// Barcha guruhlarni olish
groupsRouter.get("/", getAllGroups);

// Yangi guruh qo'shish (faqat admin)
groupsRouter.post("/", addGroup);

// Faqat o'qituvchiga tegishli guruhlar
groupsRouter.get("/my-groups", getTeacherGroups);

// Kursga tegishli guruhlarni olish
groupsRouter.get("/course/:courseId", getCourseGroups);

// Bitta guruhni olish (dynamic route oxirida)
groupsRouter.get("/:id", getOneGroup);

// Guruhni yangilash (faqat admin)
groupsRouter.put("/:id", isAdmin, updateGroup);

// Guruhni o‘chirish (faqat admin)
groupsRouter.delete("/:id", isAdmin, deleteGroup);

export default groupsRouter;
 