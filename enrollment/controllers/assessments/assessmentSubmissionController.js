import assessmentSubmissionService from '../../services/assessments/assessmentSubmissionService.js';
import ApiResponse from '../../utils/ApiResponser.js';

class AssessmentSubmissionController {
    async createSubmission(req, res, next) {
        try {
            const submission = await assessmentSubmissionService.createSubmission(req.body, req.user.sub);
            return ApiResponse.created(res, submission, 'Submission created successfully');
        } catch (error) {
            next(error);
        }
    }

    async updateSubmission(req, res, next) {
        try {
            const submission = await assessmentSubmissionService.updateSubmission(req.params.id, req.body, req.user.sub);
            return ApiResponse.success(res, submission, 'Submission updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async gradeSubmission(req, res, next) {
        try {
            const submission = await assessmentSubmissionService.gradeSubmission(req.params.id, req.body, req.user.sub);
            return ApiResponse.success(res, submission, 'Submission graded successfully');
        } catch (error) {
            next(error);
        }
    }

    async getSubmissionById(req, res, next) {
        try {
            const submission = await assessmentSubmissionService.getSubmissionById(req.params.id);
            return ApiResponse.success(res, submission);
        } catch (error) {
            next(error);
        }
    }

    async getAssessmentSubmissions(req, res, next) {
        try {
            const result = await assessmentSubmissionService.getAssessmentSubmissions(req.query);
            return ApiResponse.success(res, result);
        } catch (error) {
            next(error);
        }
    }

    async getStudentSubmissions(req, res, next) {
        try {
            const result = await assessmentSubmissionService.getStudentSubmissions(req.query);
            return ApiResponse.success(res, result);
        } catch (error) {
            next(error);
        }
    }

    async deleteSubmission(req, res, next) {
        try {
            const submission = await assessmentSubmissionService.deleteSubmission(req.params.id, req.user.sub);
            return ApiResponse.success(res, submission, 'Submission deleted successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new AssessmentSubmissionController();

