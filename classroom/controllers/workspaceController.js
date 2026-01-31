import WorkspaceService from "../services/workspaceService.js";
import { ApiResponse, ApiError } from "shared";

class WorkspaceController {
  async create(req, res, next) {
    try {
      const { courseId, batchId } = req.body;
      const workspace = await WorkspaceService.getWorkspace(
        courseId,
        batchId,
        req.user.id,
        req.user.role,
        req.headers.authorization
      );
      return ApiResponse.created(res, workspace, "Workspace accessed/created");
    } catch (e) {
      next(e);
    }
  }

  async listMine(req, res, next) {
    try {
      const items = await WorkspaceService.listWorkspaces(
        req.user.id,
        req.user.role,
        req.headers.authorization
      );
      return ApiResponse.success(res, items, "Workspaces fetched");
    } catch (e) {
      next(e);
    }
  }

  async listPending(req, res, next) {
    try {
      const items = await WorkspaceService.listPendingWorkspaces(
        req.user.id,
        req.user.role,
        req.headers.authorization
      );
      return ApiResponse.success(res, items, "Pending workspaces fetched");
    } catch (e) {
      next(e);
    }
  }

  async get(req, res, next) {
    try {
      const ws = await WorkspaceService.getWorkspaceById(
        req.params.id,
        req.user.id,
        req.user.role,
        req.headers.authorization
      );
      return ApiResponse.success(res, ws);
    } catch (e) {
      next(e);
    }
  }

  async delete(req, res, next) {
    try {
      await WorkspaceService.deleteWorkspace(
        req.params.id,
        req.user.id,
        req.user.role,
        req.headers.authorization
      );
      return ApiResponse.success(res, null, "Workspace deleted");
    } catch (e) {
      next(e);
    }
  }

  async archive(req, res, next) {
    try {
      const ws = await WorkspaceService.archiveWorkspace(
        req.params.id,
        req.user.id,
        req.user.role,
        req.headers.authorization
      );
      return ApiResponse.success(res, ws, "Workspace archived");
    } catch (e) {
      next(e);
    }
  }
}

export default new WorkspaceController();
