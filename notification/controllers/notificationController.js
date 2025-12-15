import notificationService from '../services/notificationService.js';
import roleAuthorizationService from '../services/roleAuthorizationService.js';
import { ApiResponse } from 'shared';

class NotificationController {
    async create(req, res) {
        try {
            if (!req.user) return ApiResponse.unauthorized(res, 'Not authenticated');

            const data = {
                ...req.body,
                createdById: req.user.id,
                createdByRole: req.user.role
            };
            const notification = await notificationService.create(data, req.user);
            return ApiResponse.created(res, notification, 'Notification created');
        } catch (err) {
            return ApiResponse.error(res, err.message, 400);
        }
    }

    async update(req, res) {
        try {
            const n = await notificationService.update(req.params.id, req.body);
            return ApiResponse.success(res, n, 'Notification updated');
        } catch (err) {
            return ApiResponse.error(res, err.message, 400);
        }
    }

    async delete(req, res) {
        try {
            await notificationService.delete(req.params.id);
            return ApiResponse.success(res, null, 'Notification deleted');
        } catch (err) {
            return ApiResponse.error(res, err.message, 400);
        }
    }

    async schedule(req, res) {
        try {
            const scheduleAt = req.body.scheduleAt ? new Date(req.body.scheduleAt) : null;
            const n = await notificationService.schedule(req.params.id, scheduleAt, req.user);
            return ApiResponse.success(res, n, 'Notification scheduled');
        } catch (err) { return ApiResponse.error(res, err.message, 400); }
    }

    async cancel(req, res) {
        try {
            const n = await notificationService.cancel(req.params.id);
            return ApiResponse.success(res, n, 'Notification cancelled');
        } catch (err) {
            return ApiResponse.error(res, err.message, 400);
        }
    }

    async publish(req, res) {
        try {
            const n = await notificationService.publish(req.params.id, req.user);
            return ApiResponse.success(res, n, 'Notification published');
        } catch (err) { return ApiResponse.error(res, err.message, 400); }
    }

    async list(req, res) {
        try {
            if (req.query.mine === 'true' && req.user) {
                const data = await notificationService.listForUser(req.user, req.query);
                return ApiResponse.success(res, data, 'My notifications fetched');
            }

            const data = await notificationService.list(req.query, req.query);
            return ApiResponse.success(res, data, 'Notifications fetched');
        } catch (err) {
            return ApiResponse.error(res, err.message, 400);
        }
    }

    async get(req, res) {
        try {
            const n = await notificationService.get(req.params.id);
            if (!n) return ApiResponse.notFound(res);
            return ApiResponse.success(res, n);
        } catch (err) {
            return ApiResponse.error(res, err.message, 400);
        }
    }

    async markRead(req, res) {
        try {
            const r = await notificationService.markRead(req.params.id, req.user);
            return ApiResponse.success(res, r, 'Marked as read');
        } catch (err) {
            return ApiResponse.error(res, err.message, 400);
        }
    }

    async acknowledge(req, res) {
        try {
            const r = await notificationService.acknowledge(req.params.id, req.user);
            return ApiResponse.success(res, r, 'Acknowledged');
        } catch (err) {
            return ApiResponse.error(res, err.message, 400);
        }
    }

    async react(req, res) {
        try {
            const r = await notificationService.react(req.params.id, req.user, req.body.reaction);
            return ApiResponse.success(res, r, 'Reaction updated');
        } catch (err) {
            return ApiResponse.error(res, err.message, 400);
        }
    }

    async receipts(req, res) {
        try {
            const data = await notificationService.receipts(req.params.id, req.query);
            return ApiResponse.success(res, data, 'Receipts fetched');
        } catch (err) {
            return ApiResponse.error(res, err.message, 400);
        }
    }

    async getMyScope(req, res) {
        try {
            if (!req.user) return ApiResponse.unauthorized(res, 'Not authenticated');
            const targets = await roleAuthorizationService.getAvailableTargets(req.user);
            return ApiResponse.success(res, targets, 'Available targets fetched');
        } catch (err) {
            return ApiResponse.error(res, err.message, 400);
        }
    }

    async getSent(req, res) {
        try {
            if (!req.user) return ApiResponse.unauthorized(res, 'Not authenticated');
            const data = await notificationService.list({ createdById: req.user.id, ...req.query }, req.query);
            return ApiResponse.success(res, data, 'Sent notifications fetched');
        } catch (err) {
            return ApiResponse.error(res, err.message, 400);
        }
    }
}

export default new NotificationController();
