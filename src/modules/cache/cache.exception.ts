export class CacheError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'CacheError';
  }
}

export class CacheConnectionError extends CacheError {
  constructor(message: string) {
    super(message, 'CONNECTION_ERROR');
    this.name = 'CacheConnectionError';
  }
}

export class CacheOperationError extends CacheError {
  constructor(message: string, operation: string) {
    super(message, `OPERATION_ERROR_${operation.toUpperCase()}`);
    this.name = 'CacheOperationError';
  }
}