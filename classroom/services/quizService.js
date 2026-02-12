import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';
import QuizAttempt from '../models/QuizAttempt.js';
import { ApiError } from 'shared';

class QuizService {
    async createQuiz(data, userId) {
        const { workspaceId, title, description, instructions, duration, maxAttempts, passingScore, startAt, endAt, shuffleQuestions, shuffleOptions, showResultsAfterSubmit, showCorrectAnswers, allowLateSubmissions } = data;

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
            allowLateSubmissions: allowLateSubmissions || false,
            createdById: userId,
            status: 'draft'
        });

        return quiz;
    }

    async getQuizById(id) {
        const quiz = await Quiz.findById(id);
        if (!quiz) {
            throw new ApiError(404, 'Quiz not found');
        }

        const questions = await Question.find({ quizId: id }).sort({ order: 1 });
        const quizData = quiz.toObject();
        quizData.questions = questions;

        return quizData;
    }

    async listQuizzesByWorkspace(workspaceId, status) {
        const query = { workspaceId };
        if (status) query.status = status;

        const quizzes = await Quiz.find(query).sort({ createdAt: -1 });
        if (quizzes.length === 0) return [];

        // Single aggregation instead of 2N countDocuments calls
        const quizIds = quizzes.map(q => q._id);
        const stats = await QuizAttempt.aggregate([
            { $match: { quizId: { $in: quizIds } } },
            {
                $group: {
                    _id: {
                        quizId: '$quizId',
                        isSubmitted: {
                            $cond: [{ $in: ['$status', ['submitted', 'graded']] }, true, false]
                        }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Build stats maps
        const attemptCountMap = new Map();
        const submittedCountMap = new Map();
        for (const s of stats) {
            const qid = s._id.quizId;
            attemptCountMap.set(qid, (attemptCountMap.get(qid) || 0) + s.count);
            if (s._id.isSubmitted) {
                submittedCountMap.set(qid, (submittedCountMap.get(qid) || 0) + s.count);
            }
        }

        return quizzes.map(quiz => ({
            ...quiz.toObject(),
            attemptCount: attemptCountMap.get(quiz._id) || 0,
            submittedCount: submittedCountMap.get(quiz._id) || 0
        }));
    }

    async updateQuiz(id, updates) {
        const quiz = await Quiz.findById(id);
        if (!quiz) {
            throw new ApiError(404, 'Quiz not found');
        }

        Object.assign(quiz, updates);
        await quiz.save();

        return quiz;
    }

    async publishQuiz(id) {
        const quiz = await Quiz.findById(id);
        if (!quiz) {
            throw new ApiError(404, 'Quiz not found');
        }

        const questionCount = await Question.countDocuments({ quizId: id });
        if (questionCount === 0) {
            throw new ApiError(400, 'Cannot publish quiz without questions');
        }

        const questions = await Question.find({ quizId: id });
        const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

        quiz.status = 'published';
        quiz.publishedAt = new Date();
        quiz.questionCount = questionCount;
        quiz.maxScore = maxScore;
        await quiz.save();

        return quiz;
    }

    async closeQuiz(id) {
        const quiz = await Quiz.findById(id);
        if (!quiz) {
            throw new ApiError(404, 'Quiz not found');
        }

        quiz.status = 'closed';
        await quiz.save();

        return quiz;
    }

    async reopenQuiz(id, endAt) {
        const quiz = await Quiz.findById(id);
        if (!quiz) {
            throw new ApiError(404, 'Quiz not found');
        }

        quiz.status = 'published';
        if (endAt) {
            quiz.endAt = endAt;
        } else {
            if (endAt === null) quiz.endAt = undefined;
        }

        await quiz.save();

        return quiz;
    }

    async deleteQuiz(id) {
        const quiz = await Quiz.findById(id);
        if (!quiz) {
            throw new ApiError(404, 'Quiz not found');
        }

        await quiz.softDelete();
        await Question.updateMany({ quizId: id }, { deletedAt: new Date() });

        return null;
    }

    async getSubmissions(id) {
        const attempts = await QuizAttempt.find({ quizId: id, status: { $in: ['submitted', 'graded', 'timed_out'] } })
            .sort({ submittedAt: -1 });

        return attempts;
    }
}

export default new QuizService();
