import { toast } from "sonner";
import { analytics } from "./analytics";

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const ErrorCodes = {
  // Auth errors
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",

  // Network errors
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  SERVER_ERROR: "SERVER_ERROR",

  // Business logic errors
  INSUFFICIENT_CREDITS: "INSUFFICIENT_CREDITS",
  EXAM_NOT_FOUND: "EXAM_NOT_FOUND",
  QUESTION_NOT_FOUND: "QUESTION_NOT_FOUND",
  SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED",

  // Payment errors
  PAYMENT_FAILED: "PAYMENT_FAILED",
  INVALID_COUPON: "INVALID_COUPON",

  // Unknown errors
  UNKNOWN: "UNKNOWN",
};

export function handleError(error: unknown, context?: string): void {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Error) {
    appError = new AppError(ErrorCodes.UNKNOWN, error.message, 500, { originalError: error.message });
  } else {
    appError = new AppError(ErrorCodes.UNKNOWN, "An unexpected error occurred", 500);
  }

  // Log to analytics
  analytics.trackError(appError.code, appError.message, {
    context,
    statusCode: appError.statusCode,
    ...appError.context,
  });

  // Show user-friendly message
  const userMessage = getErrorMessage(appError.code);
  toast.error(userMessage);

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error(`[${appError.code}] ${appError.message}`, appError.context);
  }
}

export function getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    [ErrorCodes.UNAUTHORIZED]: "Please sign in to continue",
    [ErrorCodes.FORBIDDEN]: "You don't have permission to access this",
    [ErrorCodes.SESSION_EXPIRED]: "Your session has expired. Please sign in again",
    [ErrorCodes.VALIDATION_ERROR]: "Please check your input and try again",
    [ErrorCodes.INVALID_INPUT]: "Invalid input provided",
    [ErrorCodes.NETWORK_ERROR]: "Network error. Please check your connection",
    [ErrorCodes.TIMEOUT]: "Request timed out. Please try again",
    [ErrorCodes.SERVER_ERROR]: "Server error. Please try again later",
    [ErrorCodes.INSUFFICIENT_CREDITS]: "Insufficient credits. Please upgrade your plan",
    [ErrorCodes.EXAM_NOT_FOUND]: "Exam not found",
    [ErrorCodes.QUESTION_NOT_FOUND]: "Question not found",
    [ErrorCodes.SUBSCRIPTION_REQUIRED]: "This feature requires a subscription",
    [ErrorCodes.PAYMENT_FAILED]: "Payment failed. Please try again",
    [ErrorCodes.INVALID_COUPON]: "Invalid or expired coupon code",
    [ErrorCodes.UNKNOWN]: "An unexpected error occurred. Please try again",
  };

  return messages[code] || messages[ErrorCodes.UNKNOWN];
}

export function isAuthError(error: unknown): boolean {
  if (error instanceof AppError) {
    return [ErrorCodes.UNAUTHORIZED, ErrorCodes.FORBIDDEN, ErrorCodes.SESSION_EXPIRED].includes(error.code);
  }
  return false;
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof AppError) {
    return [ErrorCodes.NETWORK_ERROR, ErrorCodes.TIMEOUT, ErrorCodes.SERVER_ERROR].includes(error.code);
  }
  return false;
}

export function isValidationError(error: unknown): boolean {
  if (error instanceof AppError) {
    return [ErrorCodes.VALIDATION_ERROR, ErrorCodes.INVALID_INPUT].includes(error.code);
  }
  return false;
}
