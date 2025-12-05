import { rabbitmq } from 'shared';

const subscribeToStudentEvents = async () => {
    try {
        await rabbitmq.subscribeToQueue('student_created', (data) => {
            console.log('Received student_created event:', data);
            // TODO: Implement actual notification logic (e.g. send welcome email via email service if separated)
        });
        console.log('Subscribed to student_created queue');
    } catch (error) {
        console.error('Failed to subscribe to student events:', error);
    }
};

export default subscribeToStudentEvents;
