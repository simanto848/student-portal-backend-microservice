import express from "express";
import { createUpload } from "../middlewares/uploadMiddleware.js";
import { authenticate } from "shared";
import { ApiResponse } from "shared";

const router = express.Router();

// Upload configuration for question images
const questionImageUpload = createUpload("questions", {
    allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml"
    ],
    maxFiles: 1
});

/**
 * @route   POST /questions/images
 * @desc    Upload an image for question content (TipTap editor)
 * @access  Private (Teachers only)
 */
router.post(
    "/images",
    authenticate,
    questionImageUpload.single("image"),
    async (req, res, next) => {
        try {
            if (!req.file) {
                return ApiResponse.error(res, "No image file provided", 400);
            }

            // Build the URL path for the uploaded image
            const imageUrl = `/uploads/questions/${req.file.filename}`;

            return ApiResponse.created(res, { url: imageUrl }, "Image uploaded successfully");
        } catch (error) {
            next(error);
        }
    }
);

export default router;
