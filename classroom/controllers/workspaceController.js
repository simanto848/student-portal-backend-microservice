import WorkspaceService from '../services/workspaceService.js';
import { ApiResponse, ApiError } from 'shared';

class WorkspaceController {
  async create(req, res, next) {
    try {
      const { courseId, batchId } = req.body;
      const workspace = await WorkspaceService.getWorkspace(courseId, batchId, req.user.id, req.user.role);
      return ApiResponse.created(res, workspace, 'Workspace accessed/created');
    } catch (e) {
      next(e);
    }
  }

  async listMine(req, res, next) {
    try {
      const items = await WorkspaceService.listWorkspaces(req.user.id, req.user.role);
      return ApiResponse.success(res, items, 'Workspaces fetched');
    } catch (e) {
      next(e);
    }
  }

  async get(req, res, next) {
    try {
      const ws = await WorkspaceService.getWorkspaceById(req.params.id, req.user.id, req.user.role);
      return ApiResponse.success(res, ws);
    } catch (e) {
      next(e);
    }
  }

  async update(req, res, next) {
    try {
      const ws = await WorkspaceService.updateWorkspace(req.params.id, req.body, req.user.id);
      return ApiResponse.success(res, ws, 'Workspace updated');
    } catch (e) {
      next(e);
    }
  }

  async delete(req, res, next) {
    try {
      await WorkspaceService.deleteWorkspace(req.params.id, req.user.id);
      return ApiResponse.success(res, null, 'Workspace deleted');
    } catch (e) {
      next(e);
    }
  }

  async syncRoster(req, res, next) {
      return ApiResponse.success(res, null, 'Roster sync is automatic now');
  }
}

export default new WorkspaceController();
