import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';
import QuizAttempt from '../models/QuizAttempt.js';
import { ApiError } from 'shared';
import { fisherYatesShuffle } from '../utils/shuffle.js';

class QuizAttemptService {
    async startAttempt(quizId, studentId) {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            throw new ApiError(404, 'Quiz not found');
        }

        const now = new Date();
        let isLateAttempt = false;
        if (quiz.status !== 'published') {
            throw new ApiError(400, 'Quiz is not currently available');
        }

        if (quiz.startAt && now < quiz.startAt) {
            throw new ApiError(400, 'Quiz has not started yet');
        }

        if (quiz.endAt && now > quiz.endAt) {
            if (quiz.allowLateSubmissions) {
                isLateAttempt = true;
            } else {
                throw new ApiError(400, 'Quiz has ended');
            }
        }

        const inProgressAttempt = await QuizAttempt.findOne({
            quizId,
            studentId,
            status: 'in_progress'
        });

        if (inProgressAttempt) {
            const questions = await Question.find({ quizId }).sort({ order: 1 });
            const sanitizedQuestions = questions.map(q => ({
                id: q._id,
                type: q.type,
                text: q.text,
                options: q.options.map(o => ({ id: o.id, text: o.text })),
                points: q.points,
                order: q.order
            }));

            return {
                attempt: inProgressAttempt,
                questions: sanitizedQuestions,
                timeRemaining: inProgressAttempt.getTimeRemaining()
            };
        }

        const existingAttempts = await QuizAttempt.countDocuments({ quizId, studentId });
        if (existingAttempts >= quiz.maxAttempts) {
            throw new ApiError(400, `Maximum attempts (${quiz.maxAttempts}) reached`);
        }

        const expiresAt = new Date(Date.now() + quiz.duration * 60 * 1000);

        let questions = await Question.find({ quizId }).sort({ order: 1 });
        let questionIds = questions.map(q => q._id);

        if (quiz.shuffleQuestions) {
            fisherYatesShuffle(questionIds);
        }

        const attempt = await QuizAttempt.create({
            quizId,
            studentId,
            attemptNumber: existingAttempts + 1,
            startedAt: new Date(),
            expiresAt,
            maxScore: quiz.maxScore,
            questionsOrder: questionIds,
            answers: [],
            isLate: isLateAttempt
        });

        const orderedQuestions = questionIds.map(id => questions.find(q => q._id === id));
        const sanitizedQuestions = orderedQuestions.map(q => {
            let options = q.options.map(o => ({ id: o.id, text: o.text }));
            if (quiz.shuffleOptions && ['mcq_single', 'mcq_multiple'].includes(q.type)) {
                fisherYatesShuffle(options);
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

        return {
            attempt,
            questions: sanitizedQuestions,
            timeRemaining: quiz.duration * 60,
            isCreated: true
        };
    }

    async saveProgress(attemptId, studentId, answers) {
        const attempt = await QuizAttempt.findOne({ _id: attemptId, studentId, status: 'in_progress' });
        if (!attempt) {
            throw new ApiError(404, 'Attempt not found or already submitted');
        }

        if (attempt.hasExpired()) {
            throw new ApiError(400, 'Quiz time has expired');
        }
        attempt.answers = answers;
        await attempt.save();

        return { saved: true, timeRemaining: attempt.getTimeRemaining() };
    }

    async submitAttempt(attemptId, studentId, answers, isAutoSubmit = false) {
        const attempt = await QuizAttempt.findOne({ _id: attemptId, studentId });
        if (!attempt) {
            throw new ApiError(404, 'Attempt not found');
        }

        if (attempt.status !== 'in_progress') {
            throw new ApiError(400, 'Quiz already submitted');
        }

        const quiz = await Quiz.findById(attempt.quizId);
        const questions = await Question.find({ quizId: attempt.quizId });
        const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

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

        for (const question of questions) {
            const hasAnswer = processedAnswers.some(a => a.questionId.toString() === question._id.toString());
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

        // If it's a late attempt, it always needs manual grading (or review)
        // Or if manual grading was already needed
        attempt.status = (needsManualGrading || attempt.isLate) ? 'submitted' : 'graded';

        attempt.calculateScore();
        if (quiz.passingScore > 0) {
            attempt.isPassed = attempt.percentage >= quiz.passingScore;
        }

        await attempt.save();

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

        return result;
    }

    async getStatus(attemptId, studentId) {
        const attempt = await QuizAttempt.findOne({ _id: attemptId, studentId });
        if (!attempt) {
            throw new ApiError(404, 'Attempt not found');
        }

        return {
            status: attempt.status,
            timeRemaining: attempt.getTimeRemaining(),
            hasExpired: attempt.hasExpired(),
            answers: attempt.status === 'in_progress' ? attempt.answers : []
        };
    }

    async getResults(attemptId, userId, userRole) {
        // Teachers can view any attempt, students can only view their own
        const isTeacher = userRole === 'teacher';
        let attempt;

        if (isTeacher) {
            attempt = await QuizAttempt.findById(attemptId);
        } else {
            attempt = await QuizAttempt.findOne({ _id: attemptId, studentId: userId });
        }

        if (!attempt) {
            throw new ApiError(404, 'Attempt not found');
        }

        if (attempt.status === 'in_progress') {
            throw new ApiError(400, 'Quiz not yet submitted');
        }

        const quiz = await Quiz.findById(attempt.quizId);

        // Check if results should be shown (only applies to students, teachers always see results)
        if (!isTeacher && !quiz.showResultsAfterSubmit) {
            // Return limited info - just confirmation that quiz was submitted
            return {
                result: {
                    attempt: {
                        _id: attempt._id,
                        attemptNumber: attempt.attemptNumber,
                        status: attempt.status,
                        submittedAt: attempt.submittedAt,
                        isAutoSubmitted: attempt.isAutoSubmitted
                        // Score and percentage are NOT included
                    },
                    quiz: {
                        title: quiz.title,
                        showResultsAfterSubmit: false,
                        showCorrectAnswers: false,
                        allowReviewAfterSubmit: false
                    },
                    resultsHidden: true,
                    message: 'Results for this quiz are not available for viewing.'
                }
            };
        }

        const result = {
            attempt,
            quiz: {
                title: quiz.title,
                showResultsAfterSubmit: quiz.showResultsAfterSubmit,
                showCorrectAnswers: quiz.showCorrectAnswers,
                allowReviewAfterSubmit: quiz.allowReviewAfterSubmit
            }
        };

        // Teachers always see questions, students only if allowReviewAfterSubmit is true
        if (isTeacher || quiz.allowReviewAfterSubmit) {
            const questions = await Question.find({ quizId: quiz._id }).sort({ order: 1 });
            result.questions = questions.map(q => ({
                id: q._id,
                type: q.type,
                text: q.text,
                options: q.options,
                points: q.points,
                explanation: q.explanation,
                correctAnswer: (isTeacher || quiz.showCorrectAnswers) ? q.correctAnswer : undefined
            }));
        }

        return result;
    }

    async getStudentAttempts(quizId, studentId) {
        return await QuizAttempt.find({ quizId, studentId }).sort({ attemptNumber: -1 });
    }

    async gradeAnswer(attemptId, questionId, pointsAwarded, feedback, userId) {
        const attempt = await QuizAttempt.findById(attemptId);
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

        attempt.calculateScore();
        attempt.gradedById = userId;
        attempt.gradedAt = new Date();

        await attempt.save();
        return attempt;
    }

    async gradeOverall(attemptId, score, feedback, userId) {
        const attempt = await QuizAttempt.findById(attemptId);
        if (!attempt) {
            throw new ApiError(404, 'Attempt not found');
        }

        attempt.manualScore = score;
        if (feedback !== undefined) attempt.graderFeedback = feedback;

        attempt.calculateScore();
        attempt.gradedById = userId;
        attempt.gradedAt = new Date();
        attempt.status = 'graded';

        await attempt.save();
        return attempt;
    }

    async regrade(attemptId, userId) {
        const attempt = await QuizAttempt.findById(attemptId);
        if (!attempt) throw new ApiError(404, 'Attempt not found');

        const questions = await Question.find({ quizId: attempt.quizId });
        const questionMap = new Map(questions.map(q => [q._id.toString(), q]));
        let autoGradedScore = 0;

        for (const answer of attempt.answers) {
            const question = questionMap.get(answer.questionId);
            if (!question) continue;

            const isCorrect = question.checkAnswer(
                question.type === 'mcq_multiple' ? answer.selectedOptions :
                    (answer.selectedOptions?.[0] || answer.writtenAnswer)
            );

            if (isCorrect !== null) {
                answer.isCorrect = isCorrect;
                answer.pointsAwarded = isCorrect ? question.points : 0;
                autoGradedScore += answer.pointsAwarded;
            }
        }

        // critical: reset manual override so auto-grade takes precedence
        attempt.manualScore = undefined;
        attempt.calculateScore();
        attempt.gradedById = userId;
        attempt.gradedAt = new Date();

        await attempt.save();
        return attempt;
    }
}

export default new QuizAttemptService();
