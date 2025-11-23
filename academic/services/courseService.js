import Course from '../models/Course.js';
import Department from '../models/Department.js';
import SessionCourse from '../models/SessionCourse.js';
import { ApiError } from '../utils/ApiResponser.js';

class CourseService {
  async getAll(options = {}) {
    const { filters = {}, pagination, search } = options;
    const query = { ...filters };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (pagination && (pagination.page || pagination.limit)) {
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;
      const [courses, total] = await Promise.all([
        Course.find(query)
          .populate('departmentId', 'name shortName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Course.countDocuments(query),
      ]);

      return {
        data: courses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } else {
      const courses = await Course.find(query)
        .populate('departmentId', 'name shortName email')
        .sort({ createdAt: -1 });

      return {
        data: courses,
        total: courses.length,
      };
    }
  }

  async getById(id) {
    const course = await Course.findById(id)
      .populate({
        path: 'departmentId',
        select: 'name shortName email facultyId',
        populate: {
          path: 'facultyId',
          select: 'name email'
        }
      });

    if (!course) {
      throw new ApiError(404, 'Course not found');
    }

    const sessionCoursesCount = await SessionCourse.countDocuments({ courseId: id, deletedAt: null });
    return { ...course.toJSON(), sessionCoursesCount };
  }

  async create(payload) {
    const department = await Department.findById(payload.departmentId);
    if (!department) {
      throw new ApiError(404, 'Department not found');
    }

    const existingCourse = await Course.findOne({
      $or: [
        { code: payload.code },
        { name: payload.name, departmentId: payload.departmentId },
      ],
    });

    if (existingCourse) {
      if (existingCourse.code === payload.code) {
        throw new ApiError(409, 'Course with this code already exists');
      }
      throw new ApiError(409, 'Course with this name already exists in the department');
    }

    const course = await Course.create(payload);
    return await Course.findById(course._id).populate('departmentId', 'name shortName email');
  }

  async update(id, payload) {
    const course = await Course.findById(id);
    if (!course) {
      throw new ApiError(404, 'Course not found');
    }

    if (payload.departmentId && payload.departmentId !== course.departmentId) {
      const department = await Department.findById(payload.departmentId);
      if (!department) {
        throw new ApiError(404, 'Department not found');
      }
    }

    if (payload.code || payload.name) {
      const conflictQuery = {
        _id: { $ne: id },
        $or: [],
      };

      if (payload.code) {
        conflictQuery.$or.push({ code: payload.code });
      }
      if (payload.name) {
        conflictQuery.$or.push({
          name: payload.name,
          departmentId: payload.departmentId || course.departmentId
        });
      }

      if (conflictQuery.$or.length > 0) {
        const existingCourse = await Course.findOne(conflictQuery);
        if (existingCourse) {
          if (existingCourse.code === payload.code) {
            throw new ApiError(409, 'Course with this code already exists');
          }
          throw new ApiError(409, 'Course with this name already exists in the department');
        }
      }
    }

    Object.assign(course, payload);
    await course.save();

    return await Course.findById(id).populate('departmentId', 'name shortName email');
  }

  async delete(id) {
    const course = await Course.findById(id);
    if (!course) {
      throw new ApiError(404, 'Course not found');
    }

    const sessionCoursesCount = await SessionCourse.countDocuments({
      courseId: id,
      deletedAt: null
    });

    if (sessionCoursesCount > 0) {
      throw new ApiError(400, `Cannot delete course. ${sessionCoursesCount} session course(s) are associated with this course`);
    }

    await course.softDelete();
    return true;
  }
}

export default new CourseService();

