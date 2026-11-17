export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'You are not allowed to perform this action') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
  }
}
