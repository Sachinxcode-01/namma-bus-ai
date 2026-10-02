export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: ApiErrorDetail[] | unknown;
  };
}

export interface RequestWithId extends Express.Request {
  id?: string;
  requestId?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}
