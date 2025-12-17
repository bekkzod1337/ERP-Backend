import { Router } from "express";
import express from "express";
import { authenticateToken } from "../common/middleware/authenticateToken.js";
import { isAdmin } from "../common/middleware/isAdmin.js";
import { addStudent, deleteStudent, getAllStudents, getAllStudentsAdmin, getStudent, updateStudent } from "../core/group students/groupStudents.service.js";

const GroupStudentsRouter = express.Router();
GroupStudentsRouter.use(authenticateToken);

// POST: O'quvchini guruhga qo'shish
GroupStudentsRouter.post("/", addStudent);

// GET: admin uchun - student_id bo'yicha barcha guruhlar (dynamic route oldin)
GroupStudentsRouter.get("/admin/:id", isAdmin, getAllStudentsAdmin);

// GET: barcha o'quvchilar (teacher uchun)
GroupStudentsRouter.get("/", getAllStudents);

// GET: bitta yozuv
GroupStudentsRouter.get("/:id", getStudent);

// PUT: o'quvchi yozuvini update qilish
GroupStudentsRouter.put("/:id", isAdmin, updateStudent);

// DELETE: o'quvchini o'chirish
GroupStudentsRouter.delete("/:id", isAdmin, deleteStudent);

export default GroupStudentsRouter;
