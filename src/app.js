import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import getConfig from "./common/config/config.service.js";
import { initDatabase } from "./common/database/database.service.js";
import userRouter from "./controller/users.controller.js";
import expressErrorHandling from "./common/middleware/express.errorHandling.js";
import notFoundRoutes from "./common/middleware/notFoundRoutes.js";
import { accessLogger, errorLogger } from "./common/service/logger.service.js";
import cors from 'cors';
import cookieparser from 'cookie-parser';
import roomRouter from "./controller/rooms.controller.js";
import courseRouter from "./controller/courses.controller.js";
import { setupSwagger } from "./common/swagger/swagger.js";
import statisticsRouter from "./controller/statistics.controller.js";
import paymentRouter from "./controller/payments.controller.js";
import groupsRouter from "./controller/groups.controller.js";
import GroupStudentsRouter from "./controller/groupStudents.controller.js";
import notificationRouter from './controller/notifications.controller.js';
import gradesRouter from './controller/grades.controller.js';
import topicsRouter from './controller/topics.controller.js';
import homeworkRouter from './controller/homeworks.controller.js';
import attendanceRouter from './controller/attendance.controller.js';


const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(cookieparser());

const PORT = getConfig("EXPRESS_PORT") || 3000;

process.on("uncaughtException", (err) => {
  errorLogger.error({ type: "uncaughtException", message: err.message });
});
process.on("unhandledRejection", (err) => {
  errorLogger.error({ type: "unhandledRejection", message: err.message });
});

function initRoutes() {
  app.use("/users", userRouter);
  app.use("/room", roomRouter);
  app.use("/courses", courseRouter);
  app.use("/statistics", statisticsRouter);
  app.use("/payment", paymentRouter);
  app.use("/groups", groupsRouter);
  app.use("/group-students", GroupStudentsRouter);
  app.use("/notifications", notificationRouter);
  app.use("/grades", gradesRouter);
  app.use("/topics", topicsRouter);
  app.use("/homeworks", homeworkRouter);
  app.use("/attendance", attendanceRouter);
}

async function init() {
  app.use(express.json());

  // Logger
  app.use((req, res, next) => {
    const { url, method } = req;
    accessLogger.info({ url, method });
    next();
  });

  // 🔥 SWAGGERNI YUKLAYMIZ — ENG MUHIM QADAM
  setupSwagger(app);

  // Routerlar
  initRoutes();

  // 404
  app.use(notFoundRoutes);

  // Error handler
  app.use(expressErrorHandling);

  // DB + Server
  await initDatabase();
  app.listen(PORT, () => console.log(`Server ${PORT} ishladi`));
}

init();
