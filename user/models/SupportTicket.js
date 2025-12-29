import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const messageSchema = new mongoose.Schema({
    sender: {
        type: String,
        required: true,
    },
    senderType: {
        type: String,
        enum: ["user", "moderator", "admin", "system"],
        required: true,
    },
    senderName: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    attachments: [{
        filename: String,
        url: String,
        mimeType: String,
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const supportTicketSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        ticketNumber: {
            type: String,
            unique: true,
        },
        subject: {
            type: String,
            required: [true, "Subject is required"],
            maxlength: [200, "Subject cannot exceed 200 characters"],
        },
        description: {
            type: String,
            required: [true, "Description is required"],
        },
        category: {
            type: String,
            enum: [
                "account",
                "technical",
                "academic",
                "payment",
                "library",
                "general",
                "other",
            ],
            default: "general",
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high", "urgent"],
            default: "medium",
        },
        status: {
            type: String,
            enum: ["open", "in_progress", "pending_user", "resolved", "closed"],
            default: "open",
        },
        // Who created the ticket
        createdBy: {
            type: String,
            required: true,
        },
        createdByType: {
            type: String,
            enum: ["student", "teacher", "staff", "admin"],
            required: true,
        },
        createdByName: {
            type: String,
            required: true,
        },
        createdByEmail: {
            type: String,
            required: true,
        },
        // Assigned moderator/admin
        assignedTo: {
            type: String,
            ref: "Admin",
            default: null,
        },
        assignedToName: {
            type: String,
            default: null,
        },
        // Conversation thread
        messages: [messageSchema],
        // Metadata
        resolvedAt: {
            type: Date,
            default: null,
        },
        resolvedBy: {
            type: String,
            ref: "Admin",
            default: null,
        },
        closedAt: {
            type: Date,
            default: null,
        },
        closedBy: {
            type: String,
            ref: "Admin",
            default: null,
        },
        // Tags for categorization
        tags: [{
            type: String,
        }],
        // Internal notes (visible only to admins/moderators)
        internalNotes: [{
            note: String,
            addedBy: String,
            addedByName: String,
            createdAt: {
                type: Date,
                default: Date.now,
            },
        }],
        // Rating after resolution
        rating: {
            score: {
                type: Number,
                min: 1,
                max: 5,
            },
            feedback: String,
            ratedAt: Date,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
            },
        },
    }
);

// Generate ticket number before saving
supportTicketSchema.pre("save", async function (next) {
    if (this.isNew && !this.ticketNumber) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = String(date.getMonth() + 1).padStart(2, "0");

        // Get count of tickets this month
        const count = await mongoose.model("SupportTicket").countDocuments({
            createdAt: {
                $gte: new Date(date.getFullYear(), date.getMonth(), 1),
                $lt: new Date(date.getFullYear(), date.getMonth() + 1, 1),
            },
        });

        this.ticketNumber = `TKT-${year}${month}-${String(count + 1).padStart(4, "0")}`;
    }
    next();
});

// Indexes for efficient queries
supportTicketSchema.index({ status: 1, priority: 1 });
supportTicketSchema.index({ assignedTo: 1, status: 1 });
supportTicketSchema.index({ createdBy: 1 });
supportTicketSchema.index({ ticketNumber: 1 });
supportTicketSchema.index({ createdAt: -1 });

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);

export default SupportTicket;
