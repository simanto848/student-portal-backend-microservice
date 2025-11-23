import express from "express";
import chatRoutes from "./chatRoutes.js";

const router = express.Router();

router.use("/chats", chatRoutes);

export default router;
