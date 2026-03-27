/**
 * Enhanced global error handling middleware with security improvements
 */

// Security-sensitive error messages to prevent information disclosure
const SECURITY_SENSITIVE_ERRORS = [
  'ValidationError',
  'CastError',
  'MongoServerError',
  'MongoNetworkError',
  'MongoTimeoutError',
  'JsonWebTokenError',
  'TokenExpiredError'
];

// Error handler middleware with enhanced security
const errorHandler = (err, req, res, next) => {
  // Log error details for monitoring (never expose this to client)
  const errorDetails = {
    message: err.message,
    name: err.name,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId || 'anonymous',
    timestamp: new Date().toISOString(),
    body: req.method !== 'GET' ? req.body : undefined,
    params: req.params,
    query: req.query
  };

  console.error('Error occurred:', errorDetails);

  // Determine if this is a security-sensitive error
  const isSecuritySensitive = SECURITY_SENSITIVE_ERRORS.includes(err.name) || 
                             err.message.includes('password') ||
                             err.message.includes('token') ||
                             err.message.includes('authentication') ||
                             err.message.includes('authorization');

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message,
      value: error.value
    }));
    return res.status(400).json({
      success: false,
      message: 'Invalid input data',
      errors: errors,
      ...(process.env.NODE_ENV === 'development' && { debug: err.errors })
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry detected',
      field: field,
      ...(process.env.NODE_ENV === 'development' && { 
        debug: { field, value, keyValue: err.keyValue }
      })
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid data format',
      field: err.path,
      value: err.value,
      ...(process.env.NODE_ENV === 'development' && { debug: err })
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      code: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Session expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  // MongoDB connection error
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    return res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable',
      code: 'DATABASE_ERROR'
    });
  }

  // MongoDB duplicate key error (alternative format)
  if (err.name === 'MongoServerError' && err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry detected',
      field: field,
      ...(process.env.NODE_ENV === 'development' && { debug: err.keyPattern })
    });
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File too large',
      maxSize: err.fileSize / (1024 * 1024) + 'MB'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files uploaded'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field'
    });
  }

  // Custom application errors
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
      code: err.code || 'OPERATIONAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && { debug: err })
    });
  }

  // Security: Don't expose internal error details in production
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? (isSecuritySensitive ? 'An error occurred' : err.message)
    : err.message;

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    }),
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || Math.random().toString(36).substr(2, 9)
  });
};

// 404 Not Found handler with enhanced security
const notFound = (req, res, next) => {
  const error = new Error(`Resource not found: ${req.originalUrl}`);
  error.statusCode = 404;
  error.isOperational = true;
  
  // Log 404 attempts for security monitoring
  console.warn('404 Not Found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  next(error);
};

// Async error wrapper with enhanced error handling
const asyncHandler = (fn) => (req, res, next) => 
  Promise.resolve(fn(req, res, next)).catch(err => {
    // Add request context to error for better debugging
    err.requestContext = {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userId: req.user?.userId,
      timestamp: new Date().toISOString()
    };
    next(err);
  });

// Custom error classes for better error handling
class AppError extends Error {
  constructor(message, statusCode = 400, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field = null, value = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
    this.value = value;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHZ_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT');
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500, 'DB_ERROR');
  }
}

// Security middleware to sanitize error responses
const sanitizeErrorResponse = (err, req, res, next) => {
  // Remove sensitive information from error responses
  if (err && err.message) {
    // Replace sensitive patterns in error messages
    err.message = err.message
      .replace(/password/gi, '[REDACTED]')
      .replace(/token/gi, '[REDACTED]')
      .replace(/secret/gi, '[REDACTED]')
      .replace(/key/gi, '[REDACTED]')
      .replace(/\/[a-zA-Z0-9_-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_REDACTED]');
  }
  
  next(err);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  sanitizeErrorResponse
};
