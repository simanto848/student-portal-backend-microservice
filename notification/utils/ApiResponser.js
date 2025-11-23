class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({ success: true, message, data, statusCode });
  }
  static error(res, message = 'Something went wrong', statusCode = 500, errors = []) {
    return res.status(statusCode).json({ success: false, message, statusCode, ...(errors.length && { errors }) });
  }
  static created(res, data = null, message = 'Resource created') {
    return this.success(res, data, message, 201);
  }
  static badRequest(res, message = 'Bad request', errors = []) { return this.error(res, message, 400, errors); }
  static notFound(res, message = 'Not found') { return this.error(res, message, 404); }
  static serverError(res, message = 'Internal server error') { return this.error(res, message, 500); }
}

class ApiError extends Error {
  constructor(statusCode, message = 'Something went wrong', errors = []) {
    super(message); this.statusCode = statusCode; this.errors = errors; this.success = false;
    Error.captureStackTrace(this, this.constructor);
  }
}

export { ApiResponse, ApiError }; export default ApiResponse;
