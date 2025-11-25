import SubmissionService from '../services/submissionService.js';
import { ApiResponse } from 'shared';

class SubmissionController {
  async submitOrUpdate(req, res, next) {
    try {
      const { assignmentId } = req.params;
      const { files, textAnswer } = req.body;
      const submission = await SubmissionService.submitAssignment(assignmentId, { files, textAnswer }, req.user.id);
      return ApiResponse.success(res, submission, 'Submission saved');
    } catch (e) {
      next(e);
    }
  }

  async listByAssignment(req, res, next) {
    try {
      const { assignmentId } = req.params;
      const items = await SubmissionService.listSubmissions(assignmentId, req.user.id, req.user.role);
      return ApiResponse.success(res, items, 'Submissions fetched');
    } catch (e) {
      next(e);
    }
  }

  async get(req, res, next) {
    try {
      const submission = await SubmissionService.getSubmission(req.params.id, req.user.id, req.user.role);
      return ApiResponse.success(res, submission);
    } catch (e) {
      next(e);
    }
  }

  async grade(req, res, next) {
    try {
      const { id } = req.params;
      const { grade, rubricScores } = req.body;
      const submission = await SubmissionService.gradeSubmission(id, { grade, rubricScores }, req.user.id);
      return ApiResponse.success(res, submission, 'Submission graded');
    } catch (e) {
      next(e);
    }
  }

  async addFeedback(req, res, next) {
    try {
      const { id } = req.params;
      const { message, type } = req.body;
      const feedback = await SubmissionService.addFeedback(id, { message, type }, req.user.id, req.user.role);
      return ApiResponse.success(res, feedback, 'Feedback added');
    } catch (e) {
      next(e);
    }
  }
}

export default new SubmissionController();
