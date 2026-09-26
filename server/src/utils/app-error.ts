/**
 * Application-level error class.
 *
 * Throw this from any layer (service, repository, controller) to signal a
 * known, expected error with an HTTP status and a machine-readable code.
 * The centralized error middleware will catch it and send the correct response.
 *
 * Using a dedicated class (rather than generic Error) lets the error middleware
 * distinguish expected errors from unexpected ones and avoid leaking stack traces.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    // Restore prototype chain (required when extending built-in classes in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message: string, code = 'BAD_REQUEST'): AppError {
    return new AppError(400, code, message);
  }

  static unauthorized(message = 'Authentication required.'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have permission to perform this action.'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(resource: string): AppError {
    return new AppError(404, 'NOT_FOUND', `${resource} not found.`);
  }

  static conflict(message: string): AppError {
    return new AppError(409, 'CONFLICT', message);
  }

  static internal(message = 'An unexpected error occurred.'): AppError {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }
}
