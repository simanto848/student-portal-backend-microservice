import assessmentSubmissionService from '../../services/assessments/assessmentSubmissionService.js';
import ApiResponse from '../../utils/ApiResponser.js';

class AssessmentSubmissionController {
    // Submit assessment
    async submitAssessment(req, res, next) {
        try {
            const submission = await assessmentSubmissionService.submitAssessment(req.body, req.user.id);
            return ApiResponse.created(res, submission, 'Assessment submitted successfully');
        } catch (error) {
            next(error);
        }
    }

    // Get submission by ID
    async getSubmission(req, res, next) {
        try {
            const submission = await assessmentSubmissionService.getSubmissionById(req.params.id);
            
            // Students can only view their own submissions
            if (req.user.role === 'student' && submission.studentId !== req.user.id) {
                return ApiResponse.forbidden(res, 'You can only view your own submissions');
            }

            return ApiResponse.success(res, submission);
        } catch (error) {
            next(error);
        }
    }

    // List submissions with filters
    async listSubmissions(req, res, next) {
        try {
            const filters = { ...req.query };
            
            // Students can only view their own submissions
            if (req.user.role === 'student') {
                filters.studentId = req.user.id;
            }

            const submissions = await assessmentSubmissionService.listSubmissions(filters);
            return ApiResponse.success(res, submissions);
        } catch (error) {
            next(error);
        }
    }

    // Update submission
    async updateSubmission(req, res, next) {
        try {
            const submission = await assessmentSubmissionService.updateSubmission(req.params.id, req.body, req.user.id);
            return ApiResponse.success(res, submission, 'Submission updated successfully');
        } catch (error) {
            next(error);
        }
    }

    // Grade submission (instructor only)
    async gradeSubmission(req, res, next) {
        try {
            const submission = await assessmentSubmissionService.gradeSubmission(req.params.id, req.body, req.user.id);
            return ApiResponse.success(res, submission, 'Submission graded successfully');
        } catch (error) {
            next(error);
        }
    }

    // Delete submission
    async deleteSubmission(req, res, next) {
        try {
            await assessmentSubmissionService.deleteSubmission(req.params.id, req.user.id);
            return ApiResponse.success(res, null, 'Submission deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    // Get student's submission for an assessment
    async getStudentSubmission(req, res, next) {
        try {
            const { studentId, assessmentId } = req.params;
            
            // Students can only view their own submissions
            if (req.user.role === 'student' && req.user.id !== studentId) {
                return ApiResponse.forbidden(res, 'You can only view your own submissions');
            }

            const submission = await assessmentSubmissionService.getStudentSubmission(studentId, assessmentId);
            return ApiResponse.success(res, submission);
        } catch (error) {
            next(error);
        }
    }

    // Get all submissions for an assessment (instructor only)
    async getAssessmentSubmissions(req, res, next) {
        try {
            const submissions = await assessmentSubmissionService.getAssessmentSubmissions(req.params.assessmentId, req.user.id);
            return ApiResponse.success(res, submissions);
        } catch (error) {
            next(error);
        }
    }

    // Get assessment submission statistics (instructor only)
    async getAssessmentSubmissionStats(req, res, next) {
        try {
            const stats = await assessmentSubmissionService.getAssessmentSubmissionStats(req.params.assessmentId, req.user.id);
            return ApiResponse.success(res, stats);
        } catch (error) {
            next(error);
        }
    }
}

export default new AssessmentSubmissionController();
