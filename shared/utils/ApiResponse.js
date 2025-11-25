class ApiError extends Error {
    constructor(statusCode = 500, message = 'Something went wrong', errors = [], stack = '') {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.success = false;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

class ApiResponse {
    constructor(statusCode, message = 'Success', data = null) {
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.success = statusCode < 400;
    }

    static build(res, payload, code = 200) {
        return res.status(code).json(payload);
    }

    static success(res, data = null, message = 'Success', statusCode = 200) {
        return this.build(res, {
            success: true,
            message,
            data,
            statusCode
        }, statusCode);
    }

    static error(res, message = 'Something went wrong', statusCode = 500, errors = []) {
        return this.build(res, {
            success: false,
            message,
            statusCode,
            ...(errors?.length ? { errors } : {})
        }, statusCode);
    }

    static created(res, data = null, message = 'Resource created successfully') {
        return this.success(res, data, message, 201);
    }

    static noContent(res) {
        return res.status(204).send();
    }

    static badRequest(res, message = 'Bad request', errors = []) {
        return this.error(res, message, 400, errors);
    }

    static unauthorized(res, message = 'Unauthorized access') {
        return this.error(res, message, 401);
    }

    static forbidden(res, message = 'Forbidden') {
        return this.error(res, message, 403);
    }

    static notFound(res, message = 'Resource not found') {
        return this.error(res, message, 404);
    }

    static conflict(res, message = 'Resource already exists') {
        return this.error(res, message, 409);
    }

    static validationError(res, message = 'Validation failed', errors = []) {
        return this.error(res, message, 422, errors);
    }

    static tooManyRequests(res, message = 'Too many requests, please slow down') {
        return this.error(res, message, 429);
    }

    static serverError(res, message = 'Internal server error') {
        return this.error(res, message, 500);
    }
}

const success = (res, data = null, message = 'Success', statusCode = 200) => {
    return ApiResponse.success(res, data, message, statusCode);
};

const error = (res, message = 'Something went wrong', statusCode = 500, errors = []) => {
    return ApiResponse.error(res, message, statusCode, errors);
};

export { ApiResponse, ApiError, success, error };
export default ApiResponse;
