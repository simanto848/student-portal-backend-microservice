import cron from 'node-cron';
import Quiz from '../models/Quiz.js';
import { emitWorkspace } from '../utils/events.js';

export const startQuizNotificationJob = () => {
    // Every minute
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();

            const quizzes = await Quiz.find({
                status: 'published',
                startAt: { $lte: now },
                notificationSentAt: { $exists: false }
            });

            for (const quiz of quizzes) {
                try {
                    emitWorkspace(quiz.workspaceId, 'quiz.started', {
                        quizId: quiz._id,
                        title: quiz.title,
                        startAt: quiz.startAt
                    });

                    quiz.notificationSentAt = new Date();
                    await quiz.save();
                } catch (err) {
                    console.error(`[QuizNotification] Error processing quiz ${quiz._id}`, err);
                }
            }
        } catch (error) {
            console.error('[QuizNotification] Job error:', error);
        }
    });
};
