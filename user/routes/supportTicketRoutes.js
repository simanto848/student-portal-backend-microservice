import express from "express";
import supportTicketController from "../controllers/supportTicketController.js";
import { validate } from "../middlewares/validate.js";
import {
    createTicketSchema,
    updateTicketSchema,
    addMessageSchema,
    addNoteSchema,
    assignTicketSchema,
    rateTicketSchema,
} from "../validations/supportTicketValidation.js";
import { authenticate } from "shared";
import { requireAnyAdmin, requireAdmin } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/statistics", requireAnyAdmin, supportTicketController.getStatistics);
router.get("/my-tickets", supportTicketController.getMyTickets);
router.get("/", requireAnyAdmin, supportTicketController.getAll);
router.get("/:id", requireAnyAdmin, supportTicketController.getById);
router.post("/", validate(createTicketSchema), supportTicketController.create);
router.patch("/:id", requireAnyAdmin, validate(updateTicketSchema), supportTicketController.update);
router.post("/:id/assign", requireAdmin, validate(assignTicketSchema), supportTicketController.assign);
router.post("/:id/messages", requireAnyAdmin, validate(addMessageSchema), supportTicketController.addMessage);
router.post("/:id/notes", requireAnyAdmin, validate(addNoteSchema), supportTicketController.addInternalNote);

// Workflow actions - all admins
router.post("/:id/resolve", requireAnyAdmin, supportTicketController.resolve);
router.post("/:id/close", requireAnyAdmin, supportTicketController.close);
router.post("/:id/reopen", requireAnyAdmin, supportTicketController.reopen);

// Rate ticket (ticket creator)
router.post("/:id/rate", validate(rateTicketSchema), supportTicketController.rate);

export default router;
