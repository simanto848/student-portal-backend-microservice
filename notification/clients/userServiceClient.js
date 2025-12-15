import axios from 'axios';
import jwt from 'jsonwebtoken';

class UserServiceClient {
  constructor() {
    // Use the gateway URL - all services communicate through gateway
    this.gatewayURL = process.env.GATEWAY_URL || 'http://localhost:8000';
    this.client = axios.create({
      baseURL: this.gatewayURL,
      timeout: 10000
    });

    // Add auth header to all requests for service-to-service communication
    this.client.interceptors.request.use((config) => {
      const token = this.generateServiceToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  // Generate a service token for internal communication
  generateServiceToken() {
    return jwt.sign(
      {
        role: 'super_admin',
        sub: 'notification-service',
        type: 'service'
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1h' }
    );
  }

  async getAllStudents() { return this._getList('/api/user/students'); }
  async getAllTeachers() { return this._getList('/api/user/teachers'); }
  async getAllStaff() { return this._getList('/api/user/staffs'); }
  async getStudentsByDepartment(deptId) { return this._getList(`/api/user/students?departmentId=${deptId}`); }
  async getStudentsByBatch(batchId) { return this._getList(`/api/user/students?batchId=${batchId}`); }
  async getTeachersByDepartment(deptId) { return this._getList(`/api/user/teachers?departmentId=${deptId}`); }
  async getStaffByDepartment(deptId) { return this._getList(`/api/user/staffs?departmentId=${deptId}`); }

  // Get user by ID and role - for fetching user details when not in JWT
  async getUserById(userId, role) {
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
        facultyId: data.facultyId
      };
    } catch (err) {
      const errorDetails = {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        data: err.response?.data,
        gateway: this.gatewayURL
      };
      return null;
    }
  }

  // Faculty-level queries (get all users in departments belonging to a faculty)
  async getStudentsByFaculty(facultyId) {
    try {
      const res = await this.client.get(`/api/user/students`, { params: { facultyId, limit: 1000 } });
      return this._normalizeList(res);
    } catch (err) {
      return [];
    }
  }

  async getTeachersByFaculty(facultyId) {
    try {
      const res = await this.client.get(`/api/user/teachers`, { params: { facultyId, limit: 1000 } });
      return this._normalizeList(res);
    } catch (err) {
      return [];
    }
  }

  async getStaffByFaculty(facultyId) {
    try {
      const res = await this.client.get(`/api/user/staffs`, { params: { facultyId, limit: 1000 } });
      return this._normalizeList(res);
    } catch (err) {
      return [];
    }
  }

  async _getList(endpoint) {
    try {
      const res = await this.client.get(endpoint);
      const normalized = this._normalizeList(res);
      return normalized;
    } catch (err) {
      const errorDetails = {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        data: err.response?.data,
        gateway: this.gatewayURL
      };

      return [];
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
