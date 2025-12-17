import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  getAllUser,
  getUser,
  addUser,
  deleteUser,
  getSearch,
  adminLogin,
  updateUser,
  getToken,
  getUsersByRole,
} from "../core/users/users.service.js";

const router = Router();

// AUTH ROUTES
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/token", getToken);
router.post("/admin/login", adminLogin);

// SPECIFIC ROUTES (dynamic routelardan oldin bo'lishi kerak!)
router.get("/role/:role", getUsersByRole);    // ✅ Bu birinchi
router.get("/search/:query", getSearch);       // ✅ Bu ham birinchi

// GENERAL CRUD ROUTES
router.get("/", getAllUser);
router.post("/", addUser);

// DYNAMIC ROUTES (oxirida bo'lishi kerak!)
router.get("/:id", getUser);                   // ✅ Bu oxirida
router.delete("/:id", deleteUser);
router.put("/:id", updateUser);

export default router;