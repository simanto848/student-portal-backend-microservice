import BatchCourseInstructor from '../models/BatchCourseInstructor.js';
import ApiResponse from '../utils/ApiResponser.js';

/**
 * Middleware to check if the current user (teacher) is assigned to teach the specified course
 * This ensures only assigned teachers can perform operations on their courses
 */
export const checkInstructorAssignment = async (req, res, next) => {
    try {
        const instructorId = req.user.id;
        const { courseId, batchId } = req.body || req.params || req.query;

        if (!courseId || !batchId) {
            return ApiResponse.badRequest(res, 'Course ID and Batch ID are required');
        }

        // Check if the instructor is assigned to this batch-course
        const assignment = await BatchCourseInstructor.findOne({
            instructorId,
            courseId,
            batchId,
            status: 'active',
        });

        if (!assignment) {
            return ApiResponse.forbidden(res, 'You are not assigned to teach this course for this batch');
        }

        // Attach assignment info to request for later use
        req.courseAssignment = assignment;
        next();
    } catch (error) {
        return ApiResponse.serverError(res, 'Failed to verify instructor assignment');
    }
};

/**
 * Alternative middleware that gets course/batch from different sources
 * Used when the data might be in params, body, or query
 */
export const checkInstructorAssignmentFlexible = (sourceFields) => {
    return async (req, res, next) => {
        try {
            const instructorId = req.user.id;
            
            // Extract courseId and batchId from specified sources
            let courseId, batchId;
            
            for (const field of sourceFields.courseId || ['courseId']) {
                if (req.params[field]) courseId = req.params[field];
                else if (req.body[field]) courseId = req.body[field];
                else if (req.query[field]) courseId = req.query[field];
            }
            
            for (const field of sourceFields.batchId || ['batchId']) {
                if (req.params[field]) batchId = req.params[field];
                else if (req.body[field]) batchId = req.body[field];
                else if (req.query[field]) batchId = req.query[field];
            }

            if (!courseId || !batchId) {
                return ApiResponse.badRequest(res, 'Course ID and Batch ID are required');
            }

            // Check if the instructor is assigned to this batch-course
            const assignment = await BatchCourseInstructor.findOne({
                instructorId,
                courseId,
                batchId,
                status: 'active',
            });

            if (!assignment) {
                return ApiResponse.forbidden(res, 'You are not assigned to teach this course for this batch');
            }

            // Attach assignment info to request for later use
            req.courseAssignment = assignment;
            next();
        } catch (error) {
            return ApiResponse.serverError(res, 'Failed to verify instructor assignment');
        }
    };
};
