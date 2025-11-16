import axios from 'axios';

class UserServiceClient {
    constructor() {
        this.baseURL = process.env.USER_SERVICE_URL || 'http://localhost:8007';
        this.client = axios.create({
            baseURL: `${this.baseURL}/api/user`,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
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
            // Try to get from different user endpoints
            const endpoints = [
                `/students/${userId}`,
                `/admins/${userId}`,
                `/staffs/${userId}`,
                `/teachers/${userId}`
            ];

            for (const endpoint of endpoints) {
                try {
                    const response = await this.client.get(endpoint);
                    return response.data;
                } catch (err) {
                    // Continue to next endpoint
                    continue;
                }
            }
            throw new Error('User not found');
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch user');
        }
    }
}

export default new UserServiceClient();
