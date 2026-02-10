import axios from "axios";
import fs from "fs";
import { config } from "shared";

class UserServiceClient {
  constructor() {
    const isDocker = fs.existsSync("/.dockerenv");
    const defaultUrl = isDocker ? "http://user:8001" : "http://localhost:8001";

    this.baseURL = config.services.user || defaultUrl;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });
  }

  async getTeacherDetails(teacherId, accessToken) {
    try {
      const response = await this.client.get(`/teachers/${teacherId}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      return response.data?.data ?? response.data;
    } catch (error) {
      return null;
    }
  }

  async getStudentDetails(studentId, accessToken) {
    try {
      const response = await this.client.get(`/students/${studentId}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      return response.data?.data ?? response.data;
    } catch (error) {
      return null;
    }
  }
}

export default new UserServiceClient();
