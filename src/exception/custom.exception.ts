export class CustomError extends Error {
  code: string;
  statusCode?: number;
  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}
