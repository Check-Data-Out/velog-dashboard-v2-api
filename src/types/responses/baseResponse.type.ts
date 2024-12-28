export interface BaseResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  error: string | null;
}
