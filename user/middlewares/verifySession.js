import { ApiError } from "shared";
import Session from "../models/Session.js";

export const verifySession = async (req, res, next) => {
    try {
        if (!req.user || !req.user.sessionId) {
            // If no session ID is present in the token, but it's an authenticated route,
            // it might be a legacy token or a bug.
            // For sessions to work, we requirement sessionId.
            return next();
        }

        const session = await Session.findOne({
            _id: req.user.sessionId,
            expiresAt: { $gt: new Date() },
        });

        if (!session) {
            throw new ApiError(401, "Session has been revoked or expired. Please login again.");
        }

        // Optional: Update last active in session model on every request
        // This might be too many DB writes, depending on traffic.
        // session.lastActive = new Date();
        // await session.save();

        next();
    } catch (error) {
        next(error);
    }
};
