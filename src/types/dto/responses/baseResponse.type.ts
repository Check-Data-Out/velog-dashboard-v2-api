export class BaseResponseDto<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string | null;

  constructor(success: boolean, message: string, data?: T, error?: string | null) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
  }
}
