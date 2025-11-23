import Rubric from '../models/Rubric.js';
import Workspace from '../models/Workspace.js';
import ApiResponse from '../utils/ApiResponser.js';

class RubricController {
  async create(req,res,next){ try { const { workspaceId, name, criteria } = req.body; const ws = await Workspace.findById(workspaceId); if(!ws) return ApiResponse.notFound(res,'Workspace not found'); if (req.user.role==='teacher' && !ws.teacherIds.includes(req.user.id)) return ApiResponse.forbidden(res,'Not owner'); const r = await Rubric.create({ workspaceId, name, criteria }); return ApiResponse.created(res,r,'Rubric created'); } catch(e){ next(e);} }
  async list(req,res,next){ try { const { workspaceId } = req.params; const ws = await Workspace.findById(workspaceId); if(!ws) return ApiResponse.notFound(res); if (req.user.role==='teacher' && !ws.teacherIds.includes(req.user.id)) return ApiResponse.forbidden(res,'Not owner'); const items = await Rubric.find({ workspaceId }); return ApiResponse.success(res, items,'Rubrics fetched'); } catch(e){ next(e);} }
  async get(req,res,next){ try { const r = await Rubric.findById(req.params.id); if(!r) return ApiResponse.notFound(res); const ws = await Workspace.findById(r.workspaceId); if (req.user.role==='teacher' && !ws.teacherIds.includes(req.user.id)) return ApiResponse.forbidden(res,'Not owner'); return ApiResponse.success(res,r); } catch(e){ next(e);} }
  async update(req,res,next){ try { const r = await Rubric.findById(req.params.id); if(!r) return ApiResponse.notFound(res); const ws = await Workspace.findById(r.workspaceId); if (req.user.role==='teacher' && !ws.teacherIds.includes(req.user.id)) return ApiResponse.forbidden(res,'Not owner'); Object.assign(r, req.body); await r.save(); return ApiResponse.success(res,r,'Rubric updated'); } catch(e){ next(e);} }
  async delete(req,res,next){ try { const r = await Rubric.findById(req.params.id); if(!r) return ApiResponse.notFound(res); const ws = await Workspace.findById(r.workspaceId); if (req.user.role==='teacher' && !ws.teacherIds.includes(req.user.id)) return ApiResponse.forbidden(res,'Not owner'); r.deletedAt=new Date(); await r.save(); return ApiResponse.success(res,null,'Rubric deleted'); } catch(e){ next(e);} }
}
export default new RubricController();
