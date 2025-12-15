import axios from 'axios';
import jwt from 'jsonwebtoken';

class AcademicServiceClient {
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

    // Get faculty where teacher is dean
    async getFacultyByDean(teacherId) {
        try {
            console.log('Fetching faculties for dean:', teacherId, 'via gateway:', this.gatewayURL);
            const res = await this.client.get('/api/academic/faculties', { params: { deanId: teacherId } });
            const faculties = res.data?.data || res.data || [];
            return Array.isArray(faculties) ? faculties : [];
        } catch (err) {
            console.error('getFacultyByDean failed:', {
                status: err.response?.status, code: err.code, message: err.message
            });
            return [];
        }
    }

    // Get department where teacher is head
    async getDepartmentByHead(teacherId) {
        try {
            const res = await this.client.get('/api/academic/departments', { params: { departmentHeadId: teacherId } });
            const departments = res.data?.data || res.data || [];
            return Array.isArray(departments) ? departments : [];
        } catch (err) {
            console.error('getDepartmentByHead failed:', {
                status: err.response?.status, code: err.code, message: err.message
            });
            return [];
        }
    }

    // Get batches where teacher is counselor
    async getBatchesByCounselor(teacherId) {
        try {
            const res = await this.client.get('/api/academic/batches', { params: { counselorId: teacherId } });
            const batches = res.data?.data?.batches || res.data?.data || res.data || [];
            return Array.isArray(batches) ? batches : [];
        } catch (err) {
            console.error('getBatchesByCounselor failed:', {
                status: err.response?.status, code: err.code, message: err.message
            });
            return [];
        }
    }

    // Get all departments in a faculty
    async getDepartmentsByFaculty(facultyId) {
        try {
            const res = await this.client.get(`/api/academic/faculties/${facultyId}/departments`);
            const departments = res.data?.data || res.data || [];
            return Array.isArray(departments) ? departments : [];
        } catch (err) {
            console.error('getDepartmentsByFaculty failed:', err.message);
            return [];
        }
    }

    // Get batch details
    async getBatchById(batchId) {
        try {
            const res = await this.client.get(`/api/academic/batches/${batchId}`);
            return res.data?.data || res.data || null;
        } catch (err) {
            console.error('getBatchById failed:', err.message);
            return null;
        }
    }

    // Get faculty details
    async getFacultyById(facultyId) {
        try {
            const res = await this.client.get(`/api/academic/faculties/${facultyId}`);
            return res.data?.data || res.data || null;
        } catch (err) {
            console.error('getFacultyById failed:', err.message);
            return null;
        }
    }

    // Get department details
    async getDepartmentById(departmentId) {
        try {
            const res = await this.client.get(`/api/academic/departments/${departmentId}`);
            return res.data?.data || res.data || null;
        } catch (err) {
            console.error('getDepartmentById failed:', err.message);
            return null;
        }
    }
}

export default new AcademicServiceClient();


