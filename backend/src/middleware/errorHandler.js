/**
 * Centralized error handling middleware
 * - Hides stack traces in production
 * - Handles different error types with appropriate status codes
 * - Logs errors for monitoring
 */
/* eslint-disable @typescript-eslint/no-this-alias -- false positive in class constructor and error handler */
import crypto from 'node:crypto';
import logger from '../config/logger.js';

// Custom AppError class for operational errors
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 404 handler for unknown routes
export const notFound = (req, res, next) => {
  const error = new AppError(`Route not found: ${req.originalUrl}`, 404, 'NOT_FOUND');
  next(error);
};

// Main error handler
export const errorHandler = (err, req, res, next) => {
  // AUTH-016: every error carries a request id so logs, audit rows and client
  // reports correlate. Stack traces leave the process in development only.
  const requestId = req.id || crypto.randomUUID();
  req.id = requestId;
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = Object.values(err.errors || {})
      .map(e => e.message)
      .join(', ');
  } else if (err.name === 'CastError') {
    // Mongoose invalid ObjectId
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field} already exists`;
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    code = 'UPLOAD_ERROR';
    if (err.code === 'LIMIT_FILE_SIZE') message = 'File too large';
    else if (err.code === 'LIMIT_FILE_COUNT') message = 'Too many files';
    else message = err.message;
  } else if (!err.isOperational) {
    // Unexpected error in production
    if (process.env.NODE_ENV === 'production') {
      message = 'Something went wrong. Please try again later.';
    }
  }

  // Log error via Pino (never silent): operational 5xx included, with id.
  logger.error({ requestId, statusCode, code, message: err.message, stack: err.stack }, '[request-error]');

  // Response — stack only in development (never staging/production).
  const response = {
    message,
    code,
    requestId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

// Async error wrapper to avoid try-catch in route handlers
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Rate limit error handler
export const rateLimitHandler = (req, res) => {
  res.status(429).json({
    message: 'Too many requests. Please try again later.',
    code: 'RATE_LIMIT',
  });
};