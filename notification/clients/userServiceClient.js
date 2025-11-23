import axios from 'axios';

class UserServiceClient {
  constructor() {
    this.baseURL = process.env.USER_SERVICE_URL || 'http://localhost:8007';
    this.client = axios.create({ baseURL: this.baseURL, timeout: 10000 });
  }

  async getAllStudents() { return this._getList('/students'); }
  async getAllTeachers() { return this._getList('/teachers'); }
  async getStudentsByDepartment(deptId) { return this._getList(`/departments/${deptId}/students`); }
  async getStudentsByBatch(batchId) { return this._getList(`/batches/${batchId}/students`); }

  async _getList(endpoint) {
    try {
      const res = await this.client.get(endpoint);
      const data = res.data?.data || res.data;
      return (data || []).map(u => ({ id: u.id || u._id, role: u.role || u.userRole || u.type || 'student' }));
    } catch (err) {
      console.error('User service call failed', endpoint, err.message);
      return [];
    }
  }
}

export default new UserServiceClient();
