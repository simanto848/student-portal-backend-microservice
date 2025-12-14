import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';
import QuizAttempt from '../models/QuizAttempt.js';
import { ApiError, ApiResponse } from 'shared';

class QuizAttemptController {
    // Start a quiz attempt
    async start(req, res, next) {
        try {
            const { quizId } = req.params;
            const studentId = req.user.sub || req.user.id;

            const quiz = await Quiz.findById(quizId);
            if (!quiz) {
                throw new ApiError(404, 'Quiz not found');
            }

            // Check if quiz is available
            if (!quiz.isAvailable()) {
                throw new ApiError(400, 'Quiz is not currently available');
            }

            // Check attempt limits
            const existingAttempts = await QuizAttempt.countDocuments({ quizId, studentId });
            if (existingAttempts >= quiz.maxAttempts) {
                throw new ApiError(400, `Maximum attempts (${quiz.maxAttempts}) reached`);
            }

            // Check for in-progress attempt
            const inProgressAttempt = await QuizAttempt.findOne({
                quizId,
                studentId,
                status: 'in_progress'
            });

            if (inProgressAttempt) {
                // Return existing in-progress attempt
                const questions = await Question.find({ quizId }).sort({ order: 1 });
                const sanitizedQuestions = questions.map(q => ({
                    id: q._id,
                    type: q.type,
                    text: q.text,
                    options: q.options.map(o => ({ id: o.id, text: o.text })), // Remove isCorrect
                    points: q.points,
                    order: q.order
                }));

                return ApiResponse.success(res, {
                    attempt: inProgressAttempt,
                    questions: sanitizedQuestions,
                    timeRemaining: inProgressAttempt.getTimeRemaining()
                });
            }

            // Create new attempt
            const expiresAt = new Date(Date.now() + quiz.duration * 60 * 1000);

            // Get and optionally shuffle questions
            let questions = await Question.find({ quizId }).sort({ order: 1 });
            let questionIds = questions.map(q => q._id);

            if (quiz.shuffleQuestions) {
                questionIds = questionIds.sort(() => Math.random() - 0.5);
            }

            const attempt = await QuizAttempt.create({
                quizId,
                studentId,
                attemptNumber: existingAttempts + 1,
                startedAt: new Date(),
                expiresAt,
                maxScore: quiz.maxScore,
                questionsOrder: questionIds,
                answers: []
            });

            // Prepare questions for student (without correct answers)
            const orderedQuestions = questionIds.map(id => questions.find(q => q._id === id));
            const sanitizedQuestions = orderedQuestions.map(q => {
                let options = q.options.map(o => ({ id: o.id, text: o.text }));
                if (quiz.shuffleOptions && ['mcq_single', 'mcq_multiple'].includes(q.type)) {
                    options = options.sort(() => Math.random() - 0.5);
                }
                return {
                    id: q._id,
                    type: q.type,
                    text: q.text,
                    options,
                    points: q.points,
                    order: q.order
                };
            });

            return ApiResponse.created(res, {
                attempt,
                questions: sanitizedQuestions,
                timeRemaining: quiz.duration * 60
            });
        } catch (error) {
            next(error);
        }
    }

    // Save progress (auto-save answers)
    async saveProgress(req, res, next) {
        try {
            const { id } = req.params;
            const { answers } = req.body;
            const studentId = req.user.sub || req.user.id;

            const attempt = await QuizAttempt.findOne({ _id: id, studentId, status: 'in_progress' });
            if (!attempt) {
                throw new ApiError(404, 'Attempt not found or already submitted');
            }

            // Check if expired
            if (attempt.hasExpired()) {
                throw new ApiError(400, 'Quiz time has expired');
            }

            // Update answers
            attempt.answers = answers;
            await attempt.save();

            return ApiResponse.success(res, { saved: true, timeRemaining: attempt.getTimeRemaining() });
        } catch (error) {
            next(error);
        }
    }

    // Submit quiz attempt
    async submit(req, res, next) {
        try {
            const { id } = req.params;
            const { answers, isAutoSubmit } = req.body;
            const studentId = req.user.sub || req.user.id;

            const attempt = await QuizAttempt.findOne({ _id: id, studentId });
            if (!attempt) {
                throw new ApiError(404, 'Attempt not found');
            }

            if (attempt.status !== 'in_progress') {
                throw new ApiError(400, 'Quiz already submitted');
            }

            const quiz = await Quiz.findById(attempt.quizId);
            const questions = await Question.find({ quizId: attempt.quizId });
            const questionMap = new Map(questions.map(q => [q._id, q]));

            // Process and grade answers
            const processedAnswers = [];
            let autoGradedScore = 0;
            let needsManualGrading = false;

            for (const answer of (answers || [])) {
                const question = questionMap.get(answer.questionId);
                if (!question) continue;

                const processedAnswer = {
                    questionId: answer.questionId,
                    selectedOptions: answer.selectedOptions || [],
                    writtenAnswer: answer.writtenAnswer || '',
                    isCorrect: null,
                    pointsAwarded: null,
                    feedback: null
                };

                // Auto-grade MCQ and true/false
                const isCorrect = question.checkAnswer(
                    question.type === 'mcq_multiple' ? answer.selectedOptions :
                        (answer.selectedOptions?.[0] || answer.writtenAnswer)
                );

                if (isCorrect !== null) {
                    processedAnswer.isCorrect = isCorrect;
                    processedAnswer.pointsAwarded = isCorrect ? question.points : 0;
                    autoGradedScore += processedAnswer.pointsAwarded;
                } else {
                    needsManualGrading = true;
                }

                processedAnswers.push(processedAnswer);
            }

            // Handle unanswered questions
            for (const question of questions) {
                const hasAnswer = processedAnswers.some(a => a.questionId === question._id);
                if (!hasAnswer) {
                    processedAnswers.push({
                        questionId: question._id,
                        selectedOptions: [],
                        writtenAnswer: '',
                        isCorrect: false,
                        pointsAwarded: 0,
                        feedback: 'Not answered'
                    });
                }
            }

            attempt.answers = processedAnswers;
            attempt.submittedAt = new Date();
            attempt.isAutoSubmitted = isAutoSubmit || false;
            attempt.status = needsManualGrading ? 'submitted' : 'graded';

            // Calculate score
            attempt.calculateScore();

            // Check passing
            if (quiz.passingScore > 0) {
                attempt.isPassed = attempt.percentage >= quiz.passingScore;
            }

            await attempt.save();

            // Prepare response based on quiz settings
            const result = {
                attemptId: attempt._id,
                status: attempt.status,
                submittedAt: attempt.submittedAt,
                isAutoSubmitted: attempt.isAutoSubmitted
            };

            if (quiz.showResultsAfterSubmit) {
                result.score = attempt.score;
                result.maxScore = attempt.maxScore;
                result.percentage = attempt.percentage;
                result.isPassed = attempt.isPassed;
            }

            return ApiResponse.success(res, result, 'Quiz submitted successfully');
        } catch (error) {
            next(error);
        }
    }

    // Get attempt status (for checking time)
    async getStatus(req, res, next) {
        try {
            const { id } = req.params;
            const studentId = req.user.sub || req.user.id;

            const attempt = await QuizAttempt.findOne({ _id: id, studentId });
            if (!attempt) {
                throw new ApiError(404, 'Attempt not found');
            }

            return ApiResponse.success(res, {
                status: attempt.status,
                timeRemaining: attempt.getTimeRemaining(),
                hasExpired: attempt.hasExpired(),
                answers: attempt.status === 'in_progress' ? attempt.answers : []
            });
        } catch (error) {
            next(error);
        }
    }

    // Get attempt results
    async getResults(req, res, next) {
        try {
            const { id } = req.params;
            const studentId = req.user.sub || req.user.id;

            const attempt = await QuizAttempt.findOne({ _id: id, studentId });
            if (!attempt) {
                throw new ApiError(404, 'Attempt not found');
            }

            if (attempt.status === 'in_progress') {
                throw new ApiError(400, 'Quiz not yet submitted');
            }

            const quiz = await Quiz.findById(attempt.quizId);

            const result = {
                attempt,
                quiz: {
                    title: quiz.title,
                    showCorrectAnswers: quiz.showCorrectAnswers,
                    allowReviewAfterSubmit: quiz.allowReviewAfterSubmit
                }
            };

            // Include questions with answers if allowed
            if (quiz.allowReviewAfterSubmit) {
                const questions = await Question.find({ quizId: quiz._id }).sort({ order: 1 });
                result.questions = questions.map(q => ({
                    id: q._id,
                    type: q.type,
                    text: q.text,
                    options: q.options,
                    points: q.points,
                    explanation: q.explanation,
                    correctAnswer: quiz.showCorrectAnswers ? q.correctAnswer : undefined
                }));
            }

            return ApiResponse.success(res, result);
        } catch (error) {
            next(error);
        }
    }

    // Get my attempts for a quiz
    async getMyAttempts(req, res, next) {
        try {
            const { quizId } = req.params;
            const studentId = req.user.sub || req.user.id;

            const attempts = await QuizAttempt.find({ quizId, studentId }).sort({ attemptNumber: -1 });

            return ApiResponse.success(res, attempts);
        } catch (error) {
            next(error);
        }
    }

    // Grade individual answer (teacher)
    async gradeAnswer(req, res, next) {
        try {
            const { id, questionId } = req.params;
            const { pointsAwarded, feedback } = req.body;

            const attempt = await QuizAttempt.findById(id);
            if (!attempt) {
                throw new ApiError(404, 'Attempt not found');
            }

            const answer = attempt.answers.find(a => a.questionId === questionId);
            if (!answer) {
                throw new ApiError(404, 'Answer not found');
            }

            answer.pointsAwarded = pointsAwarded;
            answer.feedback = feedback;
            answer.isCorrect = pointsAwarded > 0;

            // Recalculate score
            attempt.calculateScore();
            attempt.gradedById = req.user.sub || req.user.id;
            attempt.gradedAt = new Date();

            await attempt.save();

            return ApiResponse.success(res, attempt, 'Answer graded successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new QuizAttemptController();
