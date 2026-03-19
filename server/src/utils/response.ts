import { Response } from 'express';

/**
 * Standard API response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
}

/**
 * Create a success response object (without sending)
 */
export const successResponse = <T>(
  data: T,
  meta?: ApiResponse['meta']
): ApiResponse<T> => ({
  success: true,
  data,
  error: null,
  ...(meta && { meta }),
});

/**
 * Create an error response object (without sending)
 */
export const errorResponse = <T = unknown>(
  message: string,
  data?: T,
  errors?: Array<{ field: string; message: string }>
): ApiResponse<T | null> & { errors?: Array<{ field: string; message: string }> } => ({
  success: false,
  data: data ?? null,
  error: message,
  ...(errors && { errors }),
});

/**
 * Send a successful response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: ApiResponse['meta']
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    error: null,
    ...(meta && { meta }),
  };
  return res.status(statusCode).json(response);
};

/**
 * Send an error response
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500
): Response => {
  const response: ApiResponse<null> = {
    success: false,
    data: null,
    error: message,
  };
  return res.status(statusCode).json(response);
};

/**
 * Send a created response (201)
 */
export const sendCreated = <T>(res: Response, data: T): Response => {
  return sendSuccess(res, data, 201);
};

/**
 * Send a no content response (204)
 */
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Send a bad request error (400)
 */
export const sendBadRequest = (res: Response, message: string = 'Bad request'): Response => {
  return sendError(res, message, 400);
};

/**
 * Send an unauthorized error (401)
 */
export const sendUnauthorized = (res: Response, message: string = 'Unauthorized'): Response => {
  return sendError(res, message, 401);
};

/**
 * Send a forbidden error (403)
 */
export const sendForbidden = (res: Response, message: string = 'Forbidden'): Response => {
  return sendError(res, message, 403);
};

/**
 * Send a not found error (404)
 */
export const sendNotFound = (res: Response, message: string = 'Not found'): Response => {
  return sendError(res, message, 404);
};

/**
 * Send a conflict error (409)
 */
export const sendConflict = (res: Response, message: string = 'Conflict'): Response => {
  return sendError(res, message, 409);
};

/**
 * Send a validation error (422)
 */
export const sendValidationError = (
  res: Response,
  message: string = 'Validation error'
): Response => {
  return sendError(res, message, 422);
};

/**
 * Send a rate limit exceeded error (429)
 */
export const sendTooManyRequests = (
  res: Response,
  message: string = 'Too many requests'
): Response => {
  return sendError(res, message, 429);
};

/**
 * Send an internal server error (500)
 */
export const sendServerError = (
  res: Response,
  message: string = 'Internal server error'
): Response => {
  return sendError(res, message, 500);
};
