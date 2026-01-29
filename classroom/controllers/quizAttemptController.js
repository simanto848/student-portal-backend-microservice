import QuizAttemptService from '../services/quizeAttemptService.js';
import { ApiResponse } from 'shared';

class QuizAttemptController {
    async start(req, res, next) {
        try {
            const { quizId } = req.params;
            const studentId = req.user.sub || req.user.id;

            const result = await QuizAttemptService.startAttempt(quizId, studentId);

            if (result.isCreated) {
                return ApiResponse.created(res, {
                    attempt: result.attempt,
                    questions: result.questions,
                    timeRemaining: result.timeRemaining
                });
            }

            return ApiResponse.success(res, result, "Quiz started successfully");
        } catch (error) {
            next(error);
        }
    }

    async saveProgress(req, res, next) {
        try {
            const { id } = req.params;
            const { answers } = req.body;
            const studentId = req.user.sub || req.user.id;

            const result = await QuizAttemptService.saveProgress(id, studentId, answers);
            return ApiResponse.success(res, result, 'Quiz progress saved successfully');
        } catch (error) {
            next(error);
        }
    }

    async submit(req, res, next) {
        try {
            const { id } = req.params;
            const { answers, isAutoSubmit } = req.body;
            const studentId = req.user.sub || req.user.id;

            const result = await QuizAttemptService.submitAttempt(id, studentId, answers, isAutoSubmit);
            return ApiResponse.success(res, result, 'Quiz submitted successfully');
        } catch (error) {
            next(error);
        }
    }

    async getStatus(req, res, next) {
        try {
            const { id } = req.params;
            const studentId = req.user.sub || req.user.id;

            const result = await QuizAttemptService.getStatus(id, studentId);
            return ApiResponse.success(res, result, 'Quiz status retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getResults(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.sub || req.user.id;
            const userRole = req.user.role;

            const result = await QuizAttemptService.getResults(id, userId, userRole);
            return ApiResponse.success(res, result, 'Quiz results retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getMyAttempts(req, res, next) {
        try {
            const { quizId } = req.params;
            const studentId = req.user.sub || req.user.id;

            const attempts = await QuizAttemptService.getStudentAttempts(quizId, studentId);
            return ApiResponse.success(res, attempts, 'Quiz attempts retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getAttemptsByStudent(req, res, next) {
        try {
            const { quizId, studentId } = req.params;

            const attempts = await QuizAttemptService.getStudentAttempts(quizId, studentId);
            return ApiResponse.success(res, attempts, 'Quiz attempts retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async gradeAnswer(req, res, next) {
        try {
            const { id, questionId } = req.params;
            const { pointsAwarded, feedback } = req.body;
            const userId = req.user.sub || req.user.id;

            const attempt = await QuizAttemptService.gradeAnswer(id, questionId, pointsAwarded, feedback, userId);

            return ApiResponse.success(res, attempt, 'Answer graded successfully');
        } catch (error) {
            next(error);
        }
    }

    async gradeOverall(req, res, next) {
        try {
            const { id } = req.params;
            const { score, feedback } = req.body;
            const userId = req.user.sub || req.user.id;

            const attempt = await QuizAttemptService.gradeOverall(id, score, feedback, userId);

            return ApiResponse.success(res, attempt, 'Overall grade updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async regrade(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.sub || req.user.id;

            const attempt = await QuizAttemptService.regrade(id, userId);

            return ApiResponse.success(res, attempt, 'Attempt regraded successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new QuizAttemptController();
