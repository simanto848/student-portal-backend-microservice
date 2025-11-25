import { ApiResponse } from 'shared';
import sessionService from '../services/sessionService.js';

class SessionController {
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

      if (search) options.search = search;

      if (Object.keys(filters).length > 0) options.filters = filters;

      const result = await sessionService.getAll(options);
      return ApiResponse.success(res, result, 'Sessions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const session = await sessionService.getById(req.params.id);
      return ApiResponse.success(res, session, 'Session retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const created = await sessionService.create(req.body);
      return ApiResponse.created(res, created, 'Session created successfully');
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updated = await sessionService.update(req.params.id, req.body);
      return ApiResponse.success(res, updated, 'Session updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await sessionService.delete(req.params.id);
      return ApiResponse.success(res, null, "Session deleted successfully");
    } catch (error) {
      next(error);
    }
  }
}

export default new SessionController();

