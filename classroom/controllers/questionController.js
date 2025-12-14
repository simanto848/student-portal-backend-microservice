import Question from '../models/Question.js';
import Quiz from '../models/Quiz.js';
import { ApiError, ApiResponse } from 'shared';

class QuestionController {
    // Create a question
    async create(req, res, next) {
        try {
            const { quizId, type, text, options, correctAnswer, points, explanation } = req.body;

            // Verify quiz exists
            const quiz = await Quiz.findById(quizId);
            if (!quiz) {
                throw new ApiError(404, 'Quiz not found');
            }

            // Get next order number
            const lastQuestion = await Question.findOne({ quizId }).sort({ order: -1 });
            const order = lastQuestion ? lastQuestion.order + 1 : 0;

            const question = await Question.create({
                quizId,
                type,
                text,
                options: options || [],
                correctAnswer,
                points: points || 1,
                order,
                explanation
            });

            // Update question count on quiz
            quiz.questionCount = await Question.countDocuments({ quizId });
            await quiz.save();

            return ApiResponse.created(res, question, 'Question created successfully');
        } catch (error) {
            next(error);
        }
    }

    // Bulk create questions
    async bulkCreate(req, res, next) {
        try {
            const { quizId, questions } = req.body;

            const quiz = await Quiz.findById(quizId);
            if (!quiz) {
                throw new ApiError(404, 'Quiz not found');
            }

            // Get starting order
            const lastQuestion = await Question.findOne({ quizId }).sort({ order: -1 });
            let order = lastQuestion ? lastQuestion.order + 1 : 0;

            const createdQuestions = [];
            for (const q of questions) {
                const question = await Question.create({
                    quizId,
                    type: q.type,
                    text: q.text,
                    options: q.options || [],
                    correctAnswer: q.correctAnswer,
                    points: q.points || 1,
                    order: order++,
                    explanation: q.explanation
                });
                createdQuestions.push(question);
            }

            // Update question count
            quiz.questionCount = await Question.countDocuments({ quizId });
            await quiz.save();

            return ApiResponse.created(res, createdQuestions, `${createdQuestions.length} questions created`);
        } catch (error) {
            next(error);
        }
    }

    // Get question by ID
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const question = await Question.findById(id);

            if (!question) {
                throw new ApiError(404, 'Question not found');
            }

            return ApiResponse.success(res, question);
        } catch (error) {
            next(error);
        }
    }

    // List questions by quiz
    async listByQuiz(req, res, next) {
        try {
            const { quizId } = req.params;
            const questions = await Question.find({ quizId }).sort({ order: 1 });
            return ApiResponse.success(res, questions);
        } catch (error) {
            next(error);
        }
    }

    // Update question
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const question = await Question.findById(id);
            if (!question) {
                throw new ApiError(404, 'Question not found');
            }

            Object.assign(question, updates);
            await question.save();

            return ApiResponse.success(res, question, 'Question updated successfully');
        } catch (error) {
            next(error);
        }
    }

    // Reorder questions
    async reorder(req, res, next) {
        try {
            const { quizId } = req.params;
            const { questionIds } = req.body; // Array of question IDs in new order

            for (let i = 0; i < questionIds.length; i++) {
                await Question.findByIdAndUpdate(questionIds[i], { order: i });
            }

            const questions = await Question.find({ quizId }).sort({ order: 1 });
            return ApiResponse.success(res, questions, 'Questions reordered successfully');
        } catch (error) {
            next(error);
        }
    }

    // Delete question
    async delete(req, res, next) {
        try {
            const { id } = req.params;

            const question = await Question.findById(id);
            if (!question) {
                throw new ApiError(404, 'Question not found');
            }

            const quizId = question.quizId;
            await question.softDelete();

            // Update question count
            const quiz = await Quiz.findById(quizId);
            if (quiz) {
                quiz.questionCount = await Question.countDocuments({ quizId });
                await quiz.save();
            }

            return ApiResponse.success(res, null, 'Question deleted successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new QuestionController();
