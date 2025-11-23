import notificationService from '../services/notificationService.js';

export async function runPublisherScan() {
  try {
      const count = await notificationService.publishDueScheduled();
      return count;
  } catch (err) {
      console.error('Publisher scan failed', err.message);
      return 0;
  }
}

export default { runPublisherScan };
