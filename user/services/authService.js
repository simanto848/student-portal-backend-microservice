import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Admin from '../models/Admin.js';
import Staff from '../models/Staff.js';
import Teacher from '../models/Teacher.js';
import Student from '../models/Student.js';
import { ApiError } from 'shared';

const TOKEN_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

const REFRESH_TOKEN_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/api/user/auth',
};

class AuthService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET;
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
        this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
    }

    signToken(payload = {}) {
        return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
    }

    signRefreshToken(payload = {}) {
        return jwt.sign(payload, this.jwtSecret, { expiresIn: this.refreshTokenExpiresIn });
    }

    generateRefreshToken() {
        return crypto.randomBytes(64).toString('hex');
    }

    setAuthCookie(res, token) {
        res.cookie('accessToken', token, TOKEN_COOKIE_OPTIONS);
        return token;
    }

    setRefreshTokenCookie(res, refreshToken) {
        res.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
        return refreshToken;
    }

    clearAuthCookie(res) {
        res.clearCookie('accessToken', TOKEN_COOKIE_OPTIONS);
        res.clearCookie('refreshToken', REFRESH_TOKEN_COOKIE_OPTIONS);
    }

    getClientIp(req) {
        return req.ip ||
               req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.connection?.remoteAddress ||
               req.socket?.remoteAddress ||
               'unknown';
    }

    validateRegisteredIp(user, clientIp, roleKey) {
        if (roleKey === 'student') {
            return true;
        }

        if (!user.registeredIpAddress || user.registeredIpAddress.length === 0) {
            throw new ApiError(403, `Access denied. No registered IP addresses found for this account. Please contact administrator to register your IP address.`);
        }

        const isIpRegistered = user.registeredIpAddress.includes(clientIp);
        if (!isIpRegistered) {
            throw new ApiError(403, `Access denied. Your IP address (${clientIp}) is not registered for this account. Please contact administrator to add your IP address.`);
        }

        return true;
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

            const clientIp = this.getClientIp(req);
            this.validateRegisteredIp(user, clientIp, roleKey);

            const payload = {
                id: user.id,
                role: user.role || roleKey,
                type: roleKey,
                registrationNumber: user.registrationNumber,
                fullName: user.fullName,
                email: user.email,
            };

            const accessToken = this.signToken(payload);
            const refreshToken = this.generateRefreshToken();

            const refreshTokenExpiresAt = new Date();
            refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 30);

            user.lastLoginAt = new Date();
            user.lastLoginIp = clientIp;
            user.refreshToken = refreshToken;
            user.refreshTokenExpiresAt = refreshTokenExpiresAt;
            await user.save({ validateModifiedOnly: true });

            this.setAuthCookie(res, accessToken);
            this.setRefreshTokenCookie(res, refreshToken);

            const sanitizedUser = user.toObject();
            delete sanitizedUser.password;
            delete sanitizedUser.refreshToken;

            return {
                accessToken,
                refreshToken,
                user: sanitizedUser,
                expiresIn: this.jwtExpiresIn,
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
        try {
            this.clearAuthCookie(res);
            if (req.user && req.user.sub) {
                const models = {
                    admin: Admin,
                    staff: Staff,
                    teacher: Teacher,
                    student: Student,
                };

                const Model = models[req.user.role];
                if (Model) {
                    await Model.findByIdAndUpdate(req.user.sub, {
                        refreshToken: null,
                        refreshTokenExpiresAt: null,
                    });
                }
            }

            return { message: 'Logged out successfully' };
        } catch (error) {
            throw new ApiError(500, error.message);
        }
    }

    async refreshAccessToken(refreshToken, req, res) {
        try {
            if (!refreshToken) {
                throw new ApiError(401, 'Refresh token is required');
            }

            const models = [
                { Model: Admin, role: 'admin' },
                { Model: Staff, role: 'staff' },
                { Model: Teacher, role: 'teacher' },
                { Model: Student, role: 'student' },
            ];

            let user = null;
            let roleKey = null;
            for (const { Model, role } of models) {
                user = await Model.findOne({
                    refreshToken,
                    refreshTokenExpiresAt: { $gt: new Date() },
                    deletedAt: null,
                }).select('+refreshToken');

                if (user) {
                    roleKey = role;
                    break;
                }
            }

            if (!user) {
                throw new ApiError(401, 'Invalid or expired refresh token');
            }

            const payload = {
                id: user.id,
                role: user.role || roleKey,
                type: roleKey,
                registrationNumber: user.registrationNumber,
                fullName: user.fullName,
                email: user.email,
            };

            const accessToken = this.signToken(payload);
            this.setAuthCookie(res, accessToken);

            const sanitizedUser = user.toObject();
            delete sanitizedUser.password;
            delete sanitizedUser.refreshToken;

            return {
                accessToken,
                user: sanitizedUser,
                expiresIn: this.jwtExpiresIn,
            };
        } catch (error) {
            throw error instanceof ApiError ? error : new ApiError(500, error.message);
        }
    }
}

export default new AuthService();
