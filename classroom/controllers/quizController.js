import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';
import QuizAttempt from '../models/QuizAttempt.js';
import { ApiError, ApiResponse } from 'shared';

class QuizController {
    // Create a new quiz
    async create(req, res, next) {
        try {
            const { workspaceId, title, description, instructions, duration, maxAttempts, passingScore, startAt, endAt, shuffleQuestions, shuffleOptions, showResultsAfterSubmit, showCorrectAnswers } = req.body;

            const quiz = await Quiz.create({
                workspaceId,
                title,
                description,
                instructions,
                duration,
                maxAttempts: maxAttempts || 1,
                passingScore: passingScore || 0,
                startAt,
                endAt,
                shuffleQuestions: shuffleQuestions || false,
                shuffleOptions: shuffleOptions || false,
                showResultsAfterSubmit: showResultsAfterSubmit !== false,
                showCorrectAnswers: showCorrectAnswers || false,
                createdById: req.user.sub || req.user.id,
                status: 'draft'
            });

            return ApiResponse.created(res, quiz, 'Quiz created successfully');
        } catch (error) {
            next(error);
        }
    }

    // Get quiz by ID
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const quiz = await Quiz.findById(id);

            if (!quiz) {
                throw new ApiError(404, 'Quiz not found');
            }

            // Get questions count
            const questions = await Question.find({ quizId: id }).sort({ order: 1 });
            const quizData = quiz.toObject();
            quizData.questions = questions;

            return ApiResponse.success(res, quizData);
        } catch (error) {
            next(error);
        }
    }

    // List quizzes by workspace
    async listByWorkspace(req, res, next) {
        try {
            const { workspaceId } = req.params;
            const { status } = req.query;

            const query = { workspaceId };
            if (status) query.status = status;

            const quizzes = await Quiz.find(query).sort({ createdAt: -1 });

            // Get attempt counts for each quiz
            const quizzesWithStats = await Promise.all(quizzes.map(async (quiz) => {
                const attemptCount = await QuizAttempt.countDocuments({ quizId: quiz._id });
                const submittedCount = await QuizAttempt.countDocuments({ quizId: quiz._id, status: { $in: ['submitted', 'graded'] } });
                return {
                    ...quiz.toObject(),
                    attemptCount,
                    submittedCount
                };
            }));

            return ApiResponse.success(res, quizzesWithStats);
        } catch (error) {
            next(error);
        }
    }

    // Update quiz
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const quiz = await Quiz.findById(id);
            if (!quiz) {
                throw new ApiError(404, 'Quiz not found');
            }

            // Don't allow updating published quizzes with attempts
            if (quiz.status === 'published') {
                const hasAttempts = await QuizAttempt.exists({ quizId: id });
                if (hasAttempts) {
                    throw new ApiError(400, 'Cannot update quiz with existing attempts');
                }
            }

            Object.assign(quiz, updates);
            await quiz.save();

            return ApiResponse.success(res, quiz, 'Quiz updated successfully');
        } catch (error) {
            next(error);
        }
    }

    // Publish quiz
    async publish(req, res, next) {
        try {
            const { id } = req.params;

            const quiz = await Quiz.findById(id);
            if (!quiz) {
                throw new ApiError(404, 'Quiz not found');
            }

            // Verify quiz has questions
            const questionCount = await Question.countDocuments({ quizId: id });
            if (questionCount === 0) {
                throw new ApiError(400, 'Cannot publish quiz without questions');
            }

            // Calculate max score from questions
            const questions = await Question.find({ quizId: id });
            const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

            quiz.status = 'published';
            quiz.publishedAt = new Date();
            quiz.questionCount = questionCount;
            quiz.maxScore = maxScore;
            await quiz.save();

            return ApiResponse.success(res, quiz, 'Quiz published successfully');
        } catch (error) {
            next(error);
        }
    }

    // Close quiz
    async close(req, res, next) {
        try {
            const { id } = req.params;

            const quiz = await Quiz.findById(id);
            if (!quiz) {
                throw new ApiError(404, 'Quiz not found');
            }

            quiz.status = 'closed';
            await quiz.save();

            return ApiResponse.success(res, quiz, 'Quiz closed successfully');
        } catch (error) {
            next(error);
        }
    }

    // Delete quiz (soft delete)
    async delete(req, res, next) {
        try {
            const { id } = req.params;

            const quiz = await Quiz.findById(id);
            if (!quiz) {
                throw new ApiError(404, 'Quiz not found');
            }

            await quiz.softDelete();

            // Also soft delete all questions
            await Question.updateMany({ quizId: id }, { deletedAt: new Date() });

            return ApiResponse.success(res, null, 'Quiz deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    // Get quiz submissions for grading
    async getSubmissions(req, res, next) {
        try {
            const { id } = req.params;

            const attempts = await QuizAttempt.find({ quizId: id, status: { $in: ['submitted', 'graded', 'timed_out'] } })
                .sort({ submittedAt: -1 });

            return ApiResponse.success(res, attempts);
        } catch (error) {
            next(error);
        }
    }
}

export default new QuizController();
