import axios from 'axios';
import jwt from 'jsonwebtoken';
import { config } from 'shared';

class UserServiceClient {
  constructor() {
    this.gatewayURL = config.services.gateway;
    this.client = axios.create({
      baseURL: this.gatewayURL,
      timeout: 10000
    });

    this.client.interceptors.request.use((config) => {
      const token = this.generateServiceToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  generateServiceToken() {
    return jwt.sign(
      {
        role: 'super_admin',
        sub: 'notification-service',
        type: 'service'
      },
      config.jwt.secret,
      { expiresIn: '1h' }
    );
  }

  // Updated to support pagination
  async getAllStudents(params = {}) { return this._getList('/api/user/students', params); }
  async getAllTeachers(params = {}) { return this._getList('/api/user/teachers', params); }
  async getAllStaff(params = {}) { return this._getList('/api/user/staffs', params); }

  async getStudentsByDepartment(deptId, params = {}) { return this._getList(`/api/user/students`, { ...params, departmentId: deptId }); }
  async getStudentsByBatch(batchId, params = {}) { return this._getList(`/api/user/students`, { ...params, batchId: batchId }); }
  async getTeachersByDepartment(deptId, params = {}) { return this._getList(`/api/user/teachers`, { ...params, departmentId: deptId }); }
  async getStaffByDepartment(deptId, params = {}) { return this._getList(`/api/user/staffs`, { ...params, departmentId: deptId }); }

  async getStudentsByFaculty(facultyId, params = {}) { return this._getList(`/api/user/students`, { ...params, facultyId: facultyId }); }
  async getTeachersByFaculty(facultyId, params = {}) { return this._getList(`/api/user/teachers`, { ...params, facultyId: facultyId }); }
  async getStaffByFaculty(facultyId, params = {}) { return this._getList(`/api/user/staffs`, { ...params, facultyId: facultyId }); }

  async getUserById(userId, role) {
    if (role) {
      return this._fetchUser(userId, role);
    }

    // Parallel lookup
    const roles = ['student', 'teacher', 'staff', 'admin'];
    try {
      const results = await Promise.allSettled(roles.map(r => this._fetchUser(userId, r)));
      const found = results.find(r => r.status === 'fulfilled' && r.value !== null);
      if (found) return found.value;
    } catch (err) {
      // ignore
    }

    return null;
  }

  async getUsersByIds(userIds) {
    const results = [];
    const BATCH_SIZE = 10;

    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      const promises = batch.map(id => this.getUserById(id));
      const batchResults = await Promise.all(promises);
      results.push(...batchResults.filter(u => u !== null));
    }
    return results;
  }

  async _fetchUser(userId, role) {
    try {
      let endpoint = '/api/user/students';
      if (role === 'teacher') endpoint = '/api/user/teachers';
      else if (role === 'staff' || ['program_controller', 'admission', 'exam', 'finance', 'library', 'transport', 'hr', 'it', 'hostel'].includes(role)) {
        endpoint = '/api/user/staffs';
      } else if (role === 'admin' || role === 'super_admin') {
        endpoint = '/api/user/admins';
      }

      const res = await this.client.get(`${endpoint}/${userId}`);
      const data = res.data?.data || res.data;

      if (!data) return null;

      return {
        id: data.id || data._id,
        email: data.email,
        fullName: data.fullName,
        role: data.role || role,
        batchId: data.batchId,
        departmentId: data.departmentId,
        programId: data.programId,
        facultyId: data.facultyId,
        isDepartmentHead: data.isDepartmentHead || (data.department?.departmentHeadId === (data.id || data._id)),
        isDean: data.isDean,
        profileImage: data.profileImage
      };
    } catch (err) {
      return null;
    }
  }

  async getFullUserByToken(token) {
    try {
      const decoded = jwt.decode(token);
      const userId = decoded?.sub || decoded?.id;
      const role = decoded?.role || decoded?.type;
      if (!userId) return null;
      return this.getUserById(userId, role);
    } catch (err) {
      return null;
    }
  }

  async _getList(endpoint, params = {}) {
    try {
      // Pass pagination and filter params
      const res = await this.client.get(endpoint, { params });

      const normalized = this._normalizeList(res);
      const meta = res.data?.pagination || res.data?.meta || {};

      return {
        users: normalized,
        pagination: {
          total: meta.totalDocuments || meta.total || normalized.length,
          page: meta.page || params.page || 1,
          pages: meta.totalPages || meta.pages || 1,
          hasMore: (meta.page < meta.totalPages) || false
        }
      };
    } catch (err) {
      console.error(`[UserServiceClient] Error fetching list from ${endpoint}:`, err.message);
      return { users: [], pagination: { total: 0, page: 1, pages: 1, hasMore: false } };
    }
  }

  _normalizeList(res) {
    const data = res.data?.data?.students || res.data?.data?.teachers || res.data?.data?.staff || res.data?.data || res.data || [];
    const list = Array.isArray(data) ? data : [];
    return list.map(u => ({
      id: u.id || u._id,
      email: u.email,
      fullName: u.fullName,
      role: u.role || u.userRole || u.type || 'student'
    }));
  }
}

export default new UserServiceClient();
