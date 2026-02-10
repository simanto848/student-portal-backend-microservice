import axios from "axios";
import { config } from "shared";

class AcademicServiceClient {
  constructor() {
    this.baseURL = config.services.academic;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 5000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // Department APIs
  async getDepartmentById(departmentId, token) {
    try {
      const config = token ? { headers: { Authorization: token } } : {};
      const response = await this.client.get(
        `/departments/${departmentId}`,
        config
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAllDepartments(queryParams = {}) {
    try {
      const response = await this.client.get("/departments", {
        params: queryParams,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Faculty APIs
  async getFacultyById(facultyId) {
    try {
      const response = await this.client.get(`/faculties/${facultyId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAllFaculties(queryParams = {}) {
    try {
      const response = await this.client.get("/faculties", {
        params: queryParams,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Program APIs
  async getProgramById(programId, token) {
    try {
      const config = token ? { headers: { Authorization: token } } : {};
      const response = await this.client.get(`/programs/${programId}`, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAllPrograms(queryParams = {}) {
    try {
      const response = await this.client.get("/programs", {
        params: queryParams,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Session APIs
  async getSessionById(sessionId, token) {
    try {
      const config = token ? { headers: { Authorization: token } } : {};
      const response = await this.client.get(`/sessions/${sessionId}`, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Batch APIs
  async getAllBatches(queryParams = {}, token) {
    try {
      const config = {
        params: queryParams,
        ...(token ? { headers: { Authorization: token } } : {}),
      };
      const response = await this.client.get("/batches", config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getBatchById(batchId, token) {
    try {
      const config = token ? { headers: { Authorization: token } } : {};
      const response = await this.client.get(`/batches/${batchId}`, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateBatchCurrentStudents(batchId, delta, token) {
    try {
      // Fetch current batch
      const batchResp = await this.getBatchById(batchId, token);
      const batch = batchResp.data || batchResp;
      const newCount = Math.max(0, (batch.currentStudents || 0) + delta);
      const config = token ? { headers: { Authorization: token } } : {};
      const response = await this.client.patch(
        `/batches/${batchId}`,
        { currentStudents: newCount },
        config
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handler
  handleError(error) {
    if (error.response) {
      return new Error(error.response.data.message || "Academic service error");
    } else if (error.request) {
      return new Error("Academic service is not responding");
    } else {
      return new Error(
        error.message || "Error communicating with academic service"
      );
    }
  }
}

export default new AcademicServiceClient();
