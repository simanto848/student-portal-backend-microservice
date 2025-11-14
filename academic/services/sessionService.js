import Session from '../models/Session.js';
import Batch from '../models/Batch.js';
import SessionCourse from '../models/SessionCourse.js';
import { ApiError } from '../utils/ApiResponser.js';

class SessionService {
  async getAll(options = {}) {
    const { filters = {}, pagination = {}, search } = options;
    const { page = 1, limit = 10 } = pagination;
    const query = { ...filters };
    if (search) {
      const year = parseInt(search, 10);
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        ...(Number.isInteger(year) ? [{ year }] : []),
      ];
    }

    const skip = (page - 1) * limit;
    const [sessions, total] = await Promise.all([
      Session.find(query)
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Session.countDocuments(query),
    ]);

    return {
      data: sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id) {
    const session = await Session.findById(id);
    if (!session) {
      throw new ApiError(404, 'Session not found');
    }

    const [batchesCount, sessionCoursesCount] = await Promise.all([
      Batch.countDocuments({ sessionId: id, deletedAt: null }),
      SessionCourse.countDocuments({ sessionId: id, deletedAt: null }),
    ]);

    return {
      ...session.toJSON(),
      batchesCount,
      sessionCoursesCount,
    };
  }

  async create(payload) {
    const existing = await Session.findOne({ name: payload.name });
    if (existing) {
      throw new ApiError(409, 'Session with this name already exists');
    }

    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);
    if (!(end > start)) {
      throw new ApiError(400, 'End date must be after start date');
    }

    const created = await Session.create(payload);
    return created;
  }

  async update(id, payload) {
    const session = await Session.findById(id);
    if (!session) {
      throw new ApiError(404, 'Session not found');
    }

    if (payload.name && payload.name !== session.name) {
      const conflict = await Session.findOne({ _id: { $ne: id }, name: payload.name });
      if (conflict) {
        throw new ApiError(409, 'Session with this name already exists');
      }
    }

    if (payload.startDate && payload.endDate) {
      const start = new Date(payload.startDate);
      const end = new Date(payload.endDate);
      if (!(end > start)) {
        throw new ApiError(400, 'End date must be after start date');
      }
    }

    Object.assign(session, payload);
    await session.save();
    return session;
  }

  async delete(id) {
    const session = await Session.findById(id);
    if (!session) {
      throw new ApiError(404, 'Session not found');
    }

    const [batchesCount, sessionCoursesCount] = await Promise.all([
      Batch.countDocuments({ sessionId: id, deletedAt: null }),
      SessionCourse.countDocuments({ sessionId: id, deletedAt: null }),
    ]);

    if (batchesCount > 0 || sessionCoursesCount > 0) {
      const reasons = [];
      if (batchesCount > 0) reasons.push(`${batchesCount} batch(es)`);
      if (sessionCoursesCount > 0) reasons.push(`${sessionCoursesCount} session course(s)`);
      throw new ApiError(400, `Cannot delete session. It is referenced by ${reasons.join(' and ')}`);
    }

    await session.softDelete();
    return true;
  }
}

export default new SessionService();

