import cron from 'node-cron';
import Assignment from '../models/Assignment.js';
import Workspace from '../models/Workspace.js';
import { emitWorkspace } from '../utils/events.js';

export const startDueReminderJob = () => {
  // Every hour
  cron.schedule('0 * * * *', async () => {
    const now = new Date();
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 24h reminders
    const due24 = await Assignment.find({
        status:'published',
        dueAt: {
            $gte: now,
            $lte: in24h
        },
        reminder24hSentAt: {
            $exists: false
        }
    });
    for (const a of due24) {
        try {
            emitWorkspace(a.workspaceId,'assignment.reminder24h', { assignmentId: a.id, dueAt: a.dueAt });
            a.reminder24hSentAt = new Date();
            await a.save();
        } catch {}
    }

    // 1h reminders
    const due1 = await Assignment.find({
        status:'published',
        dueAt: {
            $gte: now,
            $lte: in1h
        },
        reminder1hSentAt: {
            $exists: false
        }
    });
    for (const a of due1) { try {
        emitWorkspace(a.workspaceId,'assignment.reminder1h', { assignmentId: a.id, dueAt: a.dueAt });
        a.reminder1hSentAt = new Date();
        await a.save();
    } catch {}
    }
  });
};
