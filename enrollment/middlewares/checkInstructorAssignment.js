import BatchCourseInstructor from '../models/BatchCourseInstructor.js';
import { ApiResponse } from 'shared';

export const checkInstructorAssignment = async (req, res, next) => {
    try {
        const instructorId = req.user.sub;
        const { courseId, batchId } = req.body || req.params || req.query;

        if (!courseId || !batchId) {
            return ApiResponse.badRequest(res, 'Course ID and Batch ID are required');
        }

        const assignment = await BatchCourseInstructor.findOne({
            instructorId,
            courseId,
            batchId,
            status: 'active',
        });

        if (!assignment) {
            return ApiResponse.forbidden(res, 'You are not assigned to teach this course for this batch');
        }

        req.courseAssignment = assignment;
        next();
    } catch (error) {
        return ApiResponse.serverError(res, 'Failed to verify instructor assignment');
    }
};

export const checkInstructorAssignmentFlexible = (sourceFields) => {
    return async (req, res, next) => {
        try {
            const instructorId = req.user.sub;
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

            const assignment = await BatchCourseInstructor.findOne({
                instructorId,
                courseId,
                batchId,
                status: 'active',
            });

            if (!assignment) {
                return ApiResponse.forbidden(res, 'You are not assigned to teach this course for this batch');
            }

            req.courseAssignment = assignment;
            next();
        } catch (error) {
            return ApiResponse.serverError(res, 'Failed to verify instructor assignment');
        }
    };
};