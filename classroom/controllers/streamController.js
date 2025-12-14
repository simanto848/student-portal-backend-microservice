import StreamItem from '../models/StreamItem.js';
import Workspace from '../models/Workspace.js';
import { ApiResponse } from 'shared';

class StreamController {
    async list(req, res, next) {
        try {
            const { workspaceId } = req.params;
            const ws = await Workspace.findById(workspaceId);
            if (!ws) return ApiResponse.notFound(res);
            if (req.user.role === 'teacher' && !ws.teacherIds.includes(req.user.id)) return ApiResponse.forbidden(res, 'Not owner');

            const items = await StreamItem.find({ workspaceId }).sort({ createdAt: -1 }).limit(200);
            return ApiResponse.success(res, items, 'Stream fetched');
        } catch (e) {
            next(e);
        }
    }
}
export default new StreamController();
