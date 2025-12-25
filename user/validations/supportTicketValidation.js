import Joi from "joi";

export const createTicketSchema = Joi.object({
    subject: Joi.string().max(200).required().messages({
        "string.max": "Subject cannot exceed 200 characters",
        "any.required": "Subject is required",
    }),
    description: Joi.string().required().messages({
        "any.required": "Description is required",
    }),
    category: Joi.string()
        .valid("account", "technical", "academic", "payment", "library", "general", "other")
        .default("general"),
    priority: Joi.string()
        .valid("low", "medium", "high", "urgent")
        .default("medium"),
    tags: Joi.array().items(Joi.string()).optional(),
});

export const updateTicketSchema = Joi.object({
    subject: Joi.string().max(200).optional(),
    category: Joi.string()
        .valid("account", "technical", "academic", "payment", "library", "general", "other")
        .optional(),
    priority: Joi.string()
        .valid("low", "medium", "high", "urgent")
        .optional(),
    status: Joi.string()
        .valid("open", "in_progress", "pending_user", "resolved", "closed")
        .optional(),
    tags: Joi.array().items(Joi.string()).optional(),
});

export const addMessageSchema = Joi.object({
    content: Joi.string().required().messages({
        "any.required": "Message content is required",
    }),
    attachments: Joi.array().items(
        Joi.object({
            filename: Joi.string().required(),
            url: Joi.string().uri().required(),
            mimeType: Joi.string().optional(),
        })
    ).optional(),
});

export const addNoteSchema = Joi.object({
    note: Joi.string().required().messages({
        "any.required": "Note content is required",
    }),
});

export const assignTicketSchema = Joi.object({
    assigneeId: Joi.string().required().messages({
        "any.required": "Assignee ID is required",
    }),
});

export const rateTicketSchema = Joi.object({
    score: Joi.number().min(1).max(5).required().messages({
        "number.min": "Rating must be at least 1",
        "number.max": "Rating cannot exceed 5",
        "any.required": "Rating score is required",
    }),
    feedback: Joi.string().max(500).optional(),
});

export default {
    createTicketSchema,
    updateTicketSchema,
    addMessageSchema,
    addNoteSchema,
    assignTicketSchema,
    rateTicketSchema,
};
