import axios from 'axios';
import jwt from 'jsonwebtoken';

class UserServiceClient {
    constructor() {
        this.baseURL = process.env.USER_SERVICE_URL || 'http://user:8007';
        this.jwtSecret = process.env.JWT_SECRET || 'mysupersecrectkey';
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    generateSystemToken() {
        return jwt.sign(
            {
                sub: 'system-library',
                id: 'system-library',
                role: 'admin',
                type: 'admin'
            },
            this.jwtSecret,
            { expiresIn: '1h' }
        );
    }

    async verifyToken(token) {
        try {
            const response = await this.client.get('/auth/verify', {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to verify token');
        }
    }

    async getUserById(userId) {
        try {
            const endpoints = [
                `/students/${userId}`,
                `/admins/${userId}`,
                `/staffs/${userId}`,
                `/teachers/${userId}`
            ];

            const token = this.generateSystemToken();
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            for (const endpoint of endpoints) {
                try {
                    const response = await this.client.get(endpoint, config);
                    if (response.data) return response.data;
                } catch (err) {
                    // Continue to next endpoint if not found
                    continue;
                }
            }
            throw new Error('User not found');
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch user');
        }
    }

    async validateUser(userType, userId, token) {
        try {
            const typeMap = {
                'student': 'students',
                'teacher': 'teachers',
                'staff': 'staffs',
                'admin': 'admins'
            };

            const endpoint = typeMap[userType];
            if (!endpoint) {
                throw new Error(`Invalid user type: ${userType}`);
            }

            const config = {};
            if (token) {
                config.headers = { Authorization: `Bearer ${token}` };
            }

            const response = await this.client.get(`/${endpoint}/${userId}`, config);
            if (!response.data || !response.data.data) {
                throw new Error(`${userType} with ID ${userId} not found`);
            }

            return response.data.data;
        } catch (error) {
            console.error(error);
            if (error.response?.status === 404) {
                throw new Error(`${userType} with ID ${userId} not found`);
            }
            throw new Error(error.message || `Failed to validate ${userType}`);
        }
    }

    async searchUsers(search, userType, token) {
        try {
            const typeMap = {
                'student': 'students',
                'teacher': 'teachers',
                'staff': 'staffs',
                'admin': 'admins'
            };

            const endpoint = typeMap[userType];
            if (!endpoint) {
                throw new Error(`Invalid user type: ${userType}`);
            }

            const config = {
                params: { search, limit: 100 }
            };
            if (token) {
                config.headers = { Authorization: `Bearer ${token}` };
            }

            const response = await this.client.get(`/${endpoint}`, config);
            const nestedData = response.data?.data;
            const data = nestedData?.[endpoint] || nestedData?.users || (Array.isArray(nestedData) ? nestedData : []);

            console.log(`[UserServiceClient] Search ${userType} found ${data.length} matches`);
            return data;
        } catch (error) {
            console.error('[UserServiceClient] Search Users Error:', {
                userType,
                search,
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            return [];
        }
    }
}

export default new UserServiceClient();