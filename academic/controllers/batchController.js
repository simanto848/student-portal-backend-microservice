import { ApiResponse, ApiError } from "shared";
import batchService from "../services/batchService.js";

class BatchController {
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

      const result = await batchService.getAll(options);
      return ApiResponse.success(res, result, "Batches retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const batch = await batchService.getById(req.params.id);
      return ApiResponse.success(res, batch, "Batch retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const batch = await batchService.create(req.body);
      return ApiResponse.created(res, batch, "Batch created successfully");
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const batch = await batchService.update(req.params.id, req.body);
      return ApiResponse.success(res, batch, "Batch updated successfully");
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await batchService.delete(req.params.id);
      return ApiResponse.success(res, null, "Batch deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  async assignCounselor(req, res, next) {
    try {
      const { counselorId } = req.body;
      const batchId = req.params.id;

      // Authorization Check
      if (req.user.role !== "admin") {
        const batch = await batchService.getById(batchId);
        const department = await batchService.getDepartmentById(
          batch.departmentId?._id || batch.departmentId
        );

        if (department.departmentHeadId !== req.user.id) {
          return next(
            new ApiError(
              403,
              "Forbidden: Only Admin or Department Head can assign counselors"
            )
          );
        }
      }

      const batch = await batchService.assignCounselor(batchId, counselorId);
      return ApiResponse.success(res, batch, "Counselor assigned successfully");
    } catch (error) {
      next(error);
    }
  }

  async updateSemester(req, res, next) {
    try {
      const { currentSemester } = req.body;
      const batch = await batchService.updateSemester(
        req.params.id,
        currentSemester
      );
      return ApiResponse.success(res, batch, "Semester updated successfully");
    } catch (error) {
      next(error);
    }
  }

  async assignClassRepresentative(req, res, next) {
    try {
      const { studentId } = req.body;
      const batch = await batchService.assignClassRepresentative(
        req.params.id,
        studentId
      );
      return ApiResponse.success(
        res,
        batch,
        "Class Representative assigned successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  async removeClassRepresentative(req, res, next) {
    try {
      const batch = await batchService.removeClassRepresentative(req.params.id);
      return ApiResponse.success(
        res,
        batch,
        "Class Representative removed successfully"
      );
    } catch (error) {
      next(error);
    }
  }
}

export default new BatchController();
