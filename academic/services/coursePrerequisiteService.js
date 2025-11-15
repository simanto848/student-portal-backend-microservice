import CoursePrerequisite from '../models/coursePrerequisite.js';
import Course from '../models/Course.js';
import { ApiError } from '../utils/ApiResponser.js';

class CoursePrerequisiteService {
    async #existsPath(startId, targetId, maxDepth = 50) {
        if (startId === targetId) return true;
        const visited = new Set([startId]);
        const queue = [{ id: startId, depth: 0 }];

        while (queue.length) {
            const { id, depth } = queue.shift();
            if (depth >= maxDepth) continue;

            const edges = await CoursePrerequisite.find({ courseId: id })
                .select('prerequisiteId')
                .lean();

            for (const e of edges) {
                const nextId = e.prerequisiteId;
                if (nextId === targetId) return true;
                if (!visited.has(nextId)) {
                    visited.add(nextId);
                    queue.push({ id: nextId, depth: depth + 1 });
                }
            }
        }
        return false;
    }

    async getAll(options = {}) {
        const { filters = {}, pagination = {} } = options;
        const { page = 1, limit = 10 } = pagination;
        const query = { ...filters };
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            CoursePrerequisite.find(query)
                .populate('courseId', 'name code credit departmentId')
                .populate('prerequisiteId', 'name code credit departmentId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            CoursePrerequisite.countDocuments(query),
        ]);

        return {
            data: items,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit) || 1,
            },
        };
    }

    async getById(id) {
        const item = await CoursePrerequisite.findById(id)
            .populate('courseId', 'name code credit departmentId')
            .populate('prerequisiteId', 'name code credit departmentId');
        if (!item) {
            throw new ApiError(404, 'Course prerequisite not found');
        }
        return item;
    }

    async create(payload) {
        const { courseId, prerequisiteId } = payload;
        const [course, prerequisite] = await Promise.all([
            Course.findById(courseId),
            Course.findById(prerequisiteId),
        ]);
        if (!course) {
            throw new ApiError(404, 'Target course not found');
        }

        if (!prerequisite) {
            throw new ApiError(404, 'Prerequisite course not found');
        }

        const existingPair = await CoursePrerequisite.findOne({ courseId, prerequisiteId });
        if (existingPair) {
            throw new ApiError(409, 'This prerequisite relation already exists');
        }

        const reversePair = await CoursePrerequisite.findOne({ courseId: prerequisiteId, prerequisiteId: courseId });
        if (reversePair) {
            throw new ApiError(409, 'Circular prerequisite relation detected (reverse pair exists)');
        }

        const createsCycle = await this.#existsPath(prerequisiteId, courseId);
        if (createsCycle) {
            throw new ApiError(409, 'Circular prerequisite relation detected (multi-level)');
        }

        const created = await CoursePrerequisite.create(payload);
        return this.getById(created._id);
    }

    async delete(id) {
        const item = await CoursePrerequisite.findById(id);
        if (!item) {
            throw new ApiError(404, 'Course prerequisite not found');
        }

        await item.softDelete();
        return true;
    }

    async getPrerequisitesByCourse(courseId, options = {}) {
        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError(404, 'Course not found');
        }
        const { pagination = {} } = options;
        const { page = 1, limit = 10 } = pagination;
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            CoursePrerequisite.find({ courseId })
                .populate('prerequisiteId', 'name code credit departmentId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            CoursePrerequisite.countDocuments({ courseId }),
        ]);

        return {
            data: items,
            course: { id: course._id, name: course.name, code: course.code },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit) || 1,
            },
        };
    }
}

export default new CoursePrerequisiteService();
