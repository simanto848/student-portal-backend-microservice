import assessmentSubmissionService from '../../services/assessments/assessmentSubmissionService.js';
import ApiResponse from '../../utils/ApiResponser.js';

class AssessmentSubmissionController {
    async submitAssessment(req, res, next) {
        try {
            const submission = await assessmentSubmissionService.createSubmission({
                ...req.body,
                studentId: req.user.sub
            });
            return ApiResponse.created(res, submission, 'Assessment submitted successfully');
        } catch (error) {
            next(error);
        }
    }

    async updateSubmission(req, res, next) {
        try {
            const submission = await assessmentSubmissionService.updateSubmission(req.params.id, req.body);
            return ApiResponse.success(res, submission, 'Submission updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async gradeSubmission(req, res, next) {
        try {
            const submission = await assessmentSubmissionService.gradeSubmission(req.params.id, req.body);
            return ApiResponse.success(res, submission, 'Submission graded successfully');
        } catch (error) {
            next(error);
        }
    }

    async getSubmission(req, res, next) {
        try {
            const submission = await assessmentSubmissionService.getSubmissionById(req.params.id);
            return ApiResponse.success(res, submission);
        } catch (error) {
            next(error);
        }
    }

    async listSubmissions(req, res, next) {
        try {
            const result = await assessmentSubmissionService.listSubmissions(req.query);
            return ApiResponse.success(res, result);
        } catch (error) {
            next(error);
        }
    }

    async getStudentSubmission(req, res, next) {
        try {
            const { studentId, assessmentId } = req.params;
            const submission = await assessmentSubmissionService.getStudentSubmission(studentId, assessmentId);
            return ApiResponse.success(res, submission);
        } catch (error) {
            next(error);
        }
    }

    async getAssessmentSubmissions(req, res, next) {
        try {
            const { assessmentId } = req.params;
            const result = await assessmentSubmissionService.listSubmissions({ assessmentId });
            return ApiResponse.success(res, result);
        } catch (error) {
            next(error);
        }
    }

    async getAssessmentSubmissionStats(req, res, next) {
        try {
            const { assessmentId } = req.params;
            const stats = await assessmentSubmissionService.getAssessmentSubmissionStats(assessmentId);
            return ApiResponse.success(res, stats);
        } catch (error) {
            next(error);
        }
    }

    async deleteSubmission(req, res, next) {
        try {
            const submission = await assessmentSubmissionService.deleteSubmission(req.params.id);
            return ApiResponse.success(res, submission, 'Submission deleted successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new AssessmentSubmissionController();
