import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ValidationError } from "class-validator";
import { Request, Response } from "express";
import { QueryFailedError, TypeORMError } from "typeorm";

// Standard error response interface
export interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  error: string;
  details?: any;
  requestId?: string;
  stack?: string;
}

// Custom application exceptions
export class ApplicationException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly code?: string,
    public readonly details?: any
  ) {
    super(message, statusCode);
  }
}

export class ValidationException extends ApplicationException {
  constructor(errors: ValidationError[], details?: any) {
    const message = ValidationException.formatValidationErrors(errors);
    super(message, HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", {
      validationErrors: errors,
      ...details,
    });
  }

  private static formatValidationErrors(errors: ValidationError[]): string {
    return errors
      .map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints)
          : [];
        return `${error.property}: ${constraints.join(", ")}`;
      })
      .join("; ");
  }
}

export class DatabaseException extends ApplicationException {
  constructor(message: string, originalError?: Error, details?: any) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, "DATABASE_ERROR", {
      originalError: originalError?.message,
      ...details,
    });
  }
}

export class AuthenticationException extends ApplicationException {
  constructor(message: string = "Authentication failed") {
    super(message, HttpStatus.UNAUTHORIZED, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationException extends ApplicationException {
  constructor(message: string = "Access denied") {
    super(message, HttpStatus.FORBIDDEN, "AUTHORIZATION_ERROR");
  }
}

export class BusinessLogicException extends ApplicationException {
  constructor(message: string, details?: any) {
    super(message, HttpStatus.BAD_REQUEST, "BUSINESS_LOGIC_ERROR", details);
  }
}

export class ExternalServiceException extends ApplicationException {
  constructor(
    service: string,
    message: string,
    statusCode?: HttpStatus,
    details?: any
  ) {
    super(
      `External service '${service}' error: ${message}`,
      statusCode || HttpStatus.BAD_GATEWAY,
      "EXTERNAL_SERVICE_ERROR",
      { service, ...details }
    );
  }
}

export class RateLimitException extends ApplicationException {
  constructor(message: string = "Rate limit exceeded", retryAfter?: number) {
    super(message, HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMIT_ERROR", {
      retryAfter,
    });
  }
}

// Global exception filter
@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.createErrorResponse(exception, request);

    // Log the error
    this.logError(exception, request, errorResponse);

    // Send the response
    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private createErrorResponse(
    exception: unknown,
    request: Request
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    const requestId = request.headers["x-request-id"] as string;

    // Handle different types of exceptions
    if (exception instanceof ApplicationException) {
      return {
        statusCode: exception.getStatus(),
        timestamp,
        path,
        method,
        message: exception.message,
        error: exception.constructor.name,
        details: (exception as any).details,
        requestId,
        ...(process.env.NODE_ENV === "development" && {
          stack: exception.stack,
        }),
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      return {
        statusCode: status,
        timestamp,
        path,
        method,
        message:
          typeof exceptionResponse === "string"
            ? exceptionResponse
            : (exceptionResponse as any).message || exception.message,
        error: exception.constructor.name,
        details:
          typeof exceptionResponse === "object" ? exceptionResponse : undefined,
        requestId,
        ...(process.env.NODE_ENV === "development" && {
          stack: exception.stack,
        }),
      };
    }

    if (exception instanceof QueryFailedError) {
      return this.handleDatabaseError(
        exception,
        timestamp,
        path,
        method,
        requestId
      );
    }

    if (exception instanceof TypeORMError) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp,
        path,
        method,
        message: "Database operation failed",
        error: "DatabaseError",
        details: { originalError: exception.message },
        requestId,
        ...(process.env.NODE_ENV === "development" && {
          stack: exception.stack,
        }),
      };
    }

    // Handle validation errors from class-validator
    if (Array.isArray(exception) && exception[0] instanceof ValidationError) {
      const validationException = new ValidationException(
        exception as ValidationError[]
      );
      return this.createErrorResponse(validationException, request);
    }

    // Handle unknown errors
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      method,
      message:
        exception instanceof Error
          ? exception.message
          : "Internal server error",
      error: "InternalServerError",
      requestId,
      ...(process.env.NODE_ENV === "development" && {
        stack:
          exception instanceof Error
            ? exception.stack
            : "No stack trace available",
      }),
    };
  }

  private handleDatabaseError(
    error: QueryFailedError,
    timestamp: string,
    path: string,
    method: string,
    requestId?: string
  ): ErrorResponse {
    const driverError = error.driverError as any;
    let message = "Database operation failed";
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

    // PostgreSQL specific error codes
    if (driverError?.code) {
      switch (driverError.code) {
        case "23505": // unique_violation
          message = "Resource already exists";
          statusCode = HttpStatus.CONFLICT;
          break;
        case "23503": // foreign_key_violation
          message = "Referenced resource does not exist";
          statusCode = HttpStatus.BAD_REQUEST;
          break;
        case "23502": // not_null_violation
          message = "Required field is missing";
          statusCode = HttpStatus.BAD_REQUEST;
          break;
        case "23514": // check_violation
          message = "Data constraint violation";
          statusCode = HttpStatus.BAD_REQUEST;
          break;
        case "08006": // connection_failure
        case "08001": // unable_to_connect
          message = "Database connection failed";
          statusCode = HttpStatus.SERVICE_UNAVAILABLE;
          break;
        default:
          message = "Database operation failed";
      }
    }

    return {
      statusCode,
      timestamp,
      path,
      method,
      message,
      error: "DatabaseError",
      details: {
        code: driverError?.code,
        constraint: driverError?.constraint,
        table: driverError?.table,
        column: driverError?.column,
      },
      requestId,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    };
  }

  private logError(
    exception: unknown,
    request: Request,
    errorResponse: ErrorResponse
  ): void {
    const { statusCode, message, error, requestId } = errorResponse;
    const userId = (request as any).user?.id;
    const userAgent = request.headers["user-agent"];
    const ip = request.ip || request.connection.remoteAddress;

    const logContext = {
      requestId,
      userId,
      method: request.method,
      url: request.url,
      userAgent,
      ip,
      statusCode,
      error: error,
      ...(exception instanceof Error && { stack: exception.stack }),
    };

    if (statusCode >= 500) {
      this.logger.error(message, logContext);
    } else if (statusCode >= 400) {
      this.logger.warn(message, logContext);
    } else {
      this.logger.log(message, logContext);
    }
  }
}

// HTTP exception filter for specific HTTP errors
@Catch(HttpException)
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: exception.message,
      error: exception.constructor.name,
      requestId: request.headers["x-request-id"] as string,
    };

    this.logger.warn(`HTTP Exception: ${exception.message}`, {
      statusCode: status,
      path: request.url,
      method: request.method,
      requestId: errorResponse.requestId,
    });

    response.status(status).json(errorResponse);
  }
}

// Validation exception filter
@Catch(ValidationException)
@Injectable()
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: ValidationException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse: ErrorResponse = {
      statusCode: exception.getStatus(),
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: exception.message,
      error: "ValidationError",
      details: (exception as any).details,
      requestId: request.headers["x-request-id"] as string,
    };

    this.logger.warn(`Validation Error: ${exception.message}`, {
      path: request.url,
      method: request.method,
      validationErrors: (exception as any).details?.validationErrors,
      requestId: errorResponse.requestId,
    });

    response.status(exception.getStatus()).json(errorResponse);
  }
}

// Database exception filter
@Catch(QueryFailedError, TypeORMError)
@Injectable()
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: QueryFailedError | TypeORMError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse: ErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: "Database operation failed",
      error: "DatabaseError",
      requestId: request.headers["x-request-id"] as string,
    };

    // Enhanced error handling for QueryFailedError
    if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as any;
      errorResponse.details = {
        code: driverError?.code,
        constraint: driverError?.constraint,
        table: driverError?.table,
        column: driverError?.column,
      };

      // Adjust status code based on error type
      if (driverError?.code === "23505") {
        errorResponse.statusCode = HttpStatus.CONFLICT;
        errorResponse.message = "Resource already exists";
      } else if (["23503", "23502", "23514"].includes(driverError?.code)) {
        errorResponse.statusCode = HttpStatus.BAD_REQUEST;
        errorResponse.message = "Data constraint violation";
      }
    }

    this.logger.error(`Database Error: ${exception.message}`, {
      query: (exception as any).query,
      parameters: (exception as any).parameters,
      driverError: (exception as any).driverError,
      path: request.url,
      method: request.method,
      requestId: errorResponse.requestId,
      stack: exception.stack,
    });

    response.status(errorResponse.statusCode).json(errorResponse);
  }
}
