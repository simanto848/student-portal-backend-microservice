import CoursePrerequisite from '../models/coursePrerequisite.js';
import Course from '../models/Course.js';
import { ApiError } from 'shared';

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
        const { filters = {}, pagination } = options;
        const query = { ...filters };

        if (pagination && (pagination.page || pagination.limit)) {
            const { page = 1, limit = 10 } = pagination;
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
        } else {
            const items = await CoursePrerequisite.find(query)
                .populate('courseId', 'name code credit departmentId')
                .populate('prerequisiteId', 'name code credit departmentId')
                .sort({ createdAt: -1 });

            return {
                data: items,
                total: items.length,
            };
        }
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

    async update(id, payload) {
        const item = await CoursePrerequisite.findById(id);
        if (!item) {
            throw new ApiError(404, 'Course prerequisite not found');
        }

        const newCourseId = payload.courseId || item.courseId;
        const newPrerequisiteId = payload.prerequisiteId || item.prerequisiteId;
        if (newCourseId === newPrerequisiteId) {
            throw new ApiError(400, 'A course cannot be a prerequisite of itself');
        }

        const lookups = [];
        if (payload.courseId && payload.courseId !== item.courseId) {
            lookups.push(Course.findById(newCourseId));
        }

        if (payload.prerequisiteId && payload.prerequisiteId !== item.prerequisiteId) {
            lookups.push(Course.findById(newPrerequisiteId));
        }

        if (lookups.length) {
            const results = await Promise.all(lookups);
            if (results.some(r => !r)) {
                throw new ApiError(404, 'Referenced course not found');
            }
        }

        if (payload.courseId || payload.prerequisiteId) {
            const existingPair = await CoursePrerequisite.findOne({ courseId: newCourseId, prerequisiteId: newPrerequisiteId });
            if (existingPair && existingPair._id.toString() !== id) {
                throw new ApiError(409, 'This prerequisite relation already exists');
            }

            const reversePair = await CoursePrerequisite.findOne({ courseId: newPrerequisiteId, prerequisiteId: newCourseId });
            if (reversePair) {
                throw new ApiError(409, 'Circular prerequisite relation detected (reverse pair exists)');
            }

            const createsCycle = await this.#existsPath(newPrerequisiteId, newCourseId);
            if (createsCycle) {
                throw new ApiError(409, 'Circular prerequisite relation detected (multi-level)');
            }
        }

        if (payload.courseId) item.courseId = payload.courseId;
        if (payload.prerequisiteId) item.prerequisiteId = payload.prerequisiteId;

        await item.save();
        return this.getById(item._id);
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
