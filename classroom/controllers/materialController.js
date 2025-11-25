import MaterialService from '../services/materialService.js';
import { ApiResponse } from 'shared';

class MaterialController {
  async create(req, res, next) {
    try {
      const { workspaceId, topicId, title, type, content, attachments } = req.body;
      const material = await MaterialService.createMaterial(workspaceId, { topicId, title, type, content, attachments }, req.user.id);
      return ApiResponse.created(res, material, 'Material created');
    } catch (e) {
      next(e);
    }
  }

  async list(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const items = await MaterialService.listMaterials(workspaceId, req.user.id, req.user.role);
      return ApiResponse.success(res, items, 'Materials fetched');
    } catch (e) {
      next(e);
    }
  }

  async get(req, res, next) {
    try {
      const material = await MaterialService.getMaterial(req.params.id, req.user.id, req.user.role);
      return ApiResponse.success(res, material);
    } catch (e) {
      next(e);
    }
  }

  async update(req, res, next) {
    try {
      const material = await MaterialService.updateMaterial(req.params.id, req.body, req.user.id);
      return ApiResponse.success(res, material, 'Material updated');
    } catch (e) {
      next(e);
    }
  }

  async delete(req, res, next) {
    try {
      await MaterialService.deleteMaterial(req.params.id, req.user.id);
      return ApiResponse.success(res, null, 'Material deleted');
    } catch (e) {
      next(e);
    }
  }
}

export default new MaterialController();
