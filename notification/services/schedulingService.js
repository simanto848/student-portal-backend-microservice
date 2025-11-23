import cron from 'node-cron';
import notificationService from './notificationService.js';

class SchedulingService {
  start() {
    cron.schedule('* * * * *', async () => {
      try { await notificationService.publishDueScheduled(); } catch (err) { console.error('Cron publish error', err.message); }
    });

    setInterval(async () => {
      try { await notificationService.publishDueScheduled(); } catch (err) {
          // Silent
      }
    }, 5000);
  }
}

export default new SchedulingService();
