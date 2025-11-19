import Enrollment from '../models/Enrollment.js';
import { ApiError } from '../utils/ApiResponser.js';

class EnrollmentService {
    async getAll(options = {}) {
        try {
            const { filters = {}, pagination = {}, search } = options;
            const { page = 1, limit = 10 } = pagination;
            const query = { ...filters };

            if (search) {
                query.$or = [
                    { enrollmentStatus: { $regex: search, $options: 'i' } },
                    { grade: { $regex: search, $options: 'i' } },
                ];
            }

            const skip = (page - 1) * limit;
            const [enrollments, total] = await Promise.all([
                Enrollment.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit)),
                Enrollment.countDocuments(query),
            ]);

            return {
                data: enrollments,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error fetching enrollments: ' + error.message);
        }
    }

    async getById(id) {
        try {
            const enrollment = await Enrollment.findById(id);
            if (!enrollment) {
                throw new ApiError(404, 'Enrollment not found');
            }
            return enrollment;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error fetching enrollment: ' + error.message);
        }
    }

    async create(payload) {
        try {
            // Check for duplicate enrollment
            const existing = await Enrollment.findOne({
                studentId: payload.studentId,
                sessionCourseId: payload.sessionCourseId,
                deletedAt: null
            });

            if (existing) {
                throw new ApiError(409, 'Student is already enrolled in this session course');
            }

            const enrollment = await Enrollment.create(payload);
            return enrollment;
        } catch (error) {
            if (error.code === 11000) {
                throw new ApiError(409, 'Student is already enrolled in this session course');
            }
            throw error instanceof ApiError ? error : new ApiError(500, 'Error creating enrollment: ' + error.message);
        }
    }

    async createBulk(enrollments) {
        try {
            // Validate for duplicates in the batch
            const uniqueKeys = new Set();
            for (const enr of enrollments) {
                const key = `${enr.studentId}-${enr.sessionCourseId}`;
                if (uniqueKeys.has(key)) {
                    throw new ApiError(400, `Duplicate enrollment in batch for student ${enr.studentId} and session course ${enr.sessionCourseId}`);
                }
                uniqueKeys.add(key);
            }

            // Check for existing enrollments
            const studentIds = enrollments.map(e => e.studentId);
            const sessionCourseIds = enrollments.map(e => e.sessionCourseId);
            const existingEnrollments = await Enrollment.find({
                studentId: { $in: studentIds },
                sessionCourseId: { $in: sessionCourseIds },
                deletedAt: null
            });

            if (existingEnrollments.length > 0) {
                const conflicts = existingEnrollments.map(e => 
                    `Student ${e.studentId} already enrolled in session course ${e.sessionCourseId}`
                );
                throw new ApiError(409, 'Some enrollments already exist', conflicts);
            }

            const created = await Enrollment.insertMany(enrollments);
            return created;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error creating bulk enrollments: ' + error.message);
        }
    }

    async update(id, payload) {
        try {
            const enrollment = await Enrollment.findById(id);
            if (!enrollment) {
                throw new ApiError(404, 'Enrollment not found');
            }

            // Prevent changing core enrollment details
            delete payload.studentId;
            delete payload.sessionCourseId;
            delete payload.sessionId;
            delete payload.courseId;

            Object.assign(enrollment, payload);
            await enrollment.save();

            return enrollment;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error updating enrollment: ' + error.message);
        }
    }

    async delete(id) {
        try {
            const enrollment = await Enrollment.findById(id);
            if (!enrollment) {
                throw new ApiError(404, 'Enrollment not found');
            }

            await enrollment.softDelete();
            return { message: 'Enrollment deleted successfully' };
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error deleting enrollment: ' + error.message);
        }
    }

    async restore(id) {
        try {
            const enrollment = await Enrollment.findOne({ _id: id, deletedAt: { $ne: null } });
            if (!enrollment) {
                throw new ApiError(404, 'Deleted enrollment not found');
            }

            await enrollment.restore();
            return enrollment;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error restoring enrollment: ' + error.message);
        }
    }

    async getByStudent(studentId, options = {}) {
        try {
            const { semester, sessionId } = options;
            const query = { studentId, deletedAt: null };
            
            if (semester) query.semester = semester;
            if (sessionId) query.sessionId = sessionId;

            const enrollments = await Enrollment.find(query).sort({ semester: 1, createdAt: -1 });
            return enrollments;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error fetching student enrollments: ' + error.message);
        }
    }

    async getBySemester(departmentId, semester, sessionId) {
        try {
            const query = { departmentId, semester, deletedAt: null };
            if (sessionId) query.sessionId = sessionId;

            const enrollments = await Enrollment.find(query).sort({ studentId: 1 });
            return enrollments;
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, 'Error fetching semester enrollments: ' + error.message);
        }
    }
}

export default new EnrollmentService();
