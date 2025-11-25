import AssignmentService from '../services/assignmentService.js';
import { ApiResponse } from 'shared';

class AssignmentController {
  async create(req, res, next) {
    try {
      const { workspaceId, topicId, title, description, attachments, dueAt, allowLate, maxScore, rubricId } = req.body;
      const assignment = await AssignmentService.createAssignment(workspaceId, { topicId, title, description, attachments, dueAt, allowLate, maxScore, rubricId }, req.user.id);
      return ApiResponse.created(res, assignment, 'Assignment draft created');
    } catch (e) {
      next(e);
    }
  }

  async list(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const items = await AssignmentService.listAssignments(workspaceId, req.user.id, req.user.role);
      return ApiResponse.success(res, items, 'Assignments fetched');
    } catch (e) {
      next(e);
    }
  }

  async get(req, res, next) {
    try {
      const assignment = await AssignmentService.getAssignment(req.params.id, req.user.id, req.user.role);
      return ApiResponse.success(res, assignment);
    } catch (e) {
      next(e);
    }
  }

  async update(req, res, next) {
    try {
      const assignment = await AssignmentService.updateAssignment(req.params.id, req.body, req.user.id);
      return ApiResponse.success(res, assignment, 'Assignment updated');
    } catch (e) {
      next(e);
    }
  }

  async publish(req, res, next) {
    try {
      const assignment = await AssignmentService.updateAssignment(req.params.id, { status: 'published' }, req.user.id);
      return ApiResponse.success(res, assignment, 'Assignment published');
    } catch (e) {
      next(e);
    }
  }

  async close(req, res, next) {
    try {
      const assignment = await AssignmentService.updateAssignment(req.params.id, { status: 'closed' }, req.user.id);
      return ApiResponse.success(res, assignment, 'Assignment closed');
    } catch (e) {
      next(e);
    }
  }

  async delete(req, res, next) {
    try {
      await AssignmentService.deleteAssignment(req.params.id, req.user.id);
      return ApiResponse.success(res, null, 'Assignment deleted');
    } catch (e) {
      next(e);
    }
  }
}

export default new AssignmentController();
