import ApiResponse from '../utils/ApiResponser.js';
import courseService from '../services/courseService.js';

class CourseController {
  async getAll(req, res, next) {
    try {
      const { page, limit, search, ...filters } = req.query;
      const options = {};
      if (page || limit) {
        options.pagination = {
          page: parseInt(page) || 1,
          limit: parseInt(limit) || 10,
        };
      }

      if (search) {
        options.search = search;
      }

      if (Object.keys(filters).length > 0) {
        options.filters = filters;
      }

      const result = await courseService.getAll(options);
      return ApiResponse.success(res, result, 'Courses retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const course = await courseService.getById(req.params.id);
      return ApiResponse.success(res, course, 'Course retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const course = await courseService.create(req.body);
      return ApiResponse.created(res, course, 'Course created successfully');
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const course = await courseService.update(req.params.id, req.body);
      return ApiResponse.success(res, course, 'Course updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await courseService.delete(req.params.id);
      return ApiResponse.success(res, null, 'Course deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new CourseController();

