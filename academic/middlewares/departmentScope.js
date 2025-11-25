import { ApiResponse } from 'shared';

const globalManagers = new Set(['super_admin','admin']);

export const canManageDepartmentResource = (req, res, next) => {
  const user = req.user;
  if (!user) return ApiResponse.unauthorized(res);
  if (globalManagers.has(user.role)) return next();
  if (user.role === 'program_controller') {
    const bodyDept = req.body?.departmentId;
    if (bodyDept && user.departmentId && bodyDept !== user.departmentId) {
      return ApiResponse.forbidden(res, 'You can only manage your own department resources');
    }

    const paramDept = req.params?.departmentId;
    if (paramDept && user.departmentId && paramDept !== user.departmentId) {
      return ApiResponse.forbidden(res, 'You can only access your own department resources');
    }
    return next();
  }
  return ApiResponse.forbidden(res, 'You do not have permission to perform this action');
};

export const applyDepartmentFilter = (req, _res, next) => {
  const user = req.user;
  if (user?.role === 'program_controller' && user.departmentId) {
    req.query = { ...req.query, departmentId: user.departmentId };
  }
  next();
};

