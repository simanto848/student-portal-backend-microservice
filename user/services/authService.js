import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Staff from '../models/Staff.js';
import Teacher from '../models/Teacher.js';
import Student from '../models/Student.js';
import { ApiError } from '../utils/ApiResponser.js';

const TOKEN_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

class AuthService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET;
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    }

    signToken(payload) {
        return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
    }

    setAuthCookie(res, token) {
        res.cookie('accessToken', token, TOKEN_COOKIE_OPTIONS);
        return token;
    }

    clearAuthCookie(res) {
        res.clearCookie('accessToken', TOKEN_COOKIE_OPTIONS);
    }

    async performLogin(Model, credentials, roleKey, req, res) {
        try {
            const { email, password } = credentials;
            if (!email || !password) {
                throw new ApiError(400, 'Email and password are required');
            }

            const user = await Model.findOne({ email, deletedAt: null }).select('+password');
            if (!user) {
                throw new ApiError(401, `${roleKey} credentials are invalid`);
            }

            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                throw new ApiError(401, `${roleKey} credentials are invalid`);
            }

            user.lastLoginAt = new Date();
            user.lastLoginIp = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
            await user.save();

            const payload = {
                sub: user.id,
                role: roleKey,
                type: roleKey,
                registrationNumber: user.registrationNumber,
                fullName: user.fullName,
                email: user.email,
            };

            const token = this.signToken(payload);
            this.setAuthCookie(res, token);

            const sanitizedUser = user.toObject();
            delete sanitizedUser.password;

            return {
                token,
                user: sanitizedUser,
            };
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, error.message);
        }
    }

    async loginAdmin(credentials, req, res) {
        return this.performLogin(Admin, credentials, 'admin', req, res);
    }

    async loginStaff(credentials, req, res) {
        return this.performLogin(Staff, credentials, 'staff', req, res);
    }

    async loginTeacher(credentials, req, res) {
        return this.performLogin(Teacher, credentials, 'teacher', req, res);
    }

    async loginStudent(credentials, req, res) {
        return this.performLogin(Student, credentials, 'student', req, res);
    }

    async logout(req, res) {
        this.clearAuthCookie(res);
        return { message: 'Logged out successfully' };
    }
}

export default new AuthService();
