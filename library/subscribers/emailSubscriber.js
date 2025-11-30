import { EVENTS, subscribeEvent } from 'shared';
import emailService from '../utils/emailService.js';

const setupEmailSubscriber = async () => {
    await subscribeEvent(EVENTS.SEND_EMAIL, async (payload) => {
        try {
            const { to, data } = payload;
            await emailService.sendGenericNotification(to, data);
            console.log(`[EmailSubscriber] Processed email for ${to}`);
        } catch (error) {
            console.error('[EmailSubscriber] Error processing email event:', error.message);
        }
    });
};

export default setupEmailSubscriber;
