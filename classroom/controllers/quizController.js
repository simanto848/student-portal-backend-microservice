import QuizService from '../services/quizService.js';
import { ApiResponse } from 'shared';

class QuizController {
    // Create a new quiz
    async create(req, res, next) {
        try {
            const result = await QuizService.createQuiz(req.body, req.user.sub || req.user.id);
            return ApiResponse.created(res, result, 'Quiz created successfully');
        } catch (error) {
            next(error);
        }
    }

    // Get quiz by ID
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const result = await QuizService.getQuizById(id);
            return ApiResponse.success(res, result, 'Quiz retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    // List quizzes by workspace
    async listByWorkspace(req, res, next) {
        try {
            const { workspaceId } = req.params;
            const { status } = req.query;

            const result = await QuizService.listQuizzesByWorkspace(workspaceId, status);
            return ApiResponse.success(res, result, 'Quizzes retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    // Update quiz
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const result = await QuizService.updateQuiz(id, updates);
            return ApiResponse.success(res, result, 'Quiz updated successfully');
        } catch (error) {
            next(error);
        }
    }

    // Publish quiz
    async publish(req, res, next) {
        try {
            const { id } = req.params;

            const result = await QuizService.publishQuiz(id);
            return ApiResponse.success(res, result, 'Quiz published successfully');
        } catch (error) {
            next(error);
        }
    }

    // Close quiz
    async close(req, res, next) {
        try {
            const { id } = req.params;

            const result = await QuizService.closeQuiz(id);
            return ApiResponse.success(res, result, 'Quiz closed successfully');
        } catch (error) {
            next(error);
        }
    }

    // Re-open quiz
    async reopen(req, res, next) {
        try {
            const { id } = req.params;
            const { endAt } = req.body;

            const result = await QuizService.reopenQuiz(id, endAt);
            return ApiResponse.success(res, result, 'Quiz re-opened successfully');
        } catch (error) {
            next(error);
        }
    }

    // Delete quiz (soft delete)
    async delete(req, res, next) {
        try {
            const { id } = req.params;

            await QuizService.deleteQuiz(id);
            return ApiResponse.success(res, null, 'Quiz deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    // Get quiz submissions for grading
    async getSubmissions(req, res, next) {
        try {
            const { id } = req.params;

            const result = await QuizService.getSubmissions(id);
            return ApiResponse.success(res, result, 'Quiz submissions retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new QuizController();
