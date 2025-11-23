import Topic from '../models/Topic.js';
import Workspace from '../models/Workspace.js';
import ApiResponse from '../utils/ApiResponser.js';

class TopicController {
  async create(req,res,next){
      try {
          const { workspaceId, title, order } = req.body;
          const ws = await Workspace.findById(workspaceId);
          if(!ws) return ApiResponse.notFound(res,'Workspace not found');
          if (req.user.role==='teacher' && !ws.teacherIds.includes(req.user.id)) return ApiResponse.forbidden(res,'Not owner');
          const t= await Topic.create({ workspaceId, title, order });
          return ApiResponse.created(res,t,'Topic created');
      } catch(e) {
          next(e);
      }
  }
  async list(req,res,next){
      try {
          const { workspaceId } = req.params;
          const ws = await Workspace.findById(workspaceId);
          if(!ws) return ApiResponse.notFound(res);
          if (req.user.role==='teacher' && !ws.teacherIds.includes(req.user.id)) return ApiResponse.forbidden(res,'Not owner');
          if (req.user.role==='student' && !ws.studentIds.includes(req.user.id)) return ApiResponse.forbidden(res,'Not enrolled');
          const items = await Topic.find({ workspaceId }).sort({ order:1 });
          return ApiResponse.success(res,items,'Topics fetched');
      } catch(e) {
          next(e);
      }
  }
  async update(req,res,next){
      try {
          const t = await Topic.findById(req.params.id);
          if(!t) return ApiResponse.notFound(res);

          const ws = await Workspace.findById(t.workspaceId);
          if (req.user.role==='teacher' && !ws.teacherIds.includes(req.user.id)) return ApiResponse.forbidden(res,'Not owner');

          Object.assign(t, req.body); await t.save();
          return ApiResponse.success(res,t,'Topic updated');
      } catch(e) {
          next(e);
      }
  }
  async delete(req,res,next){
      try {
          const t = await Topic.findById(req.params.id);
          if(!t) return ApiResponse.notFound(res);

          const ws = await Workspace.findById(t.workspaceId);
          if (req.user.role==='teacher' && !ws.teacherIds.includes(req.user.id)) return ApiResponse.forbidden(res,'Not owner');
          t.deletedAt=new Date();
          await t.save();
          return ApiResponse.success(res,null,'Topic deleted');
      } catch(e) {
          next(e);
      }
  }
}
export default new TopicController();
