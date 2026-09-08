import { type ErrorCode } from "../constants/error-codes.js";
import { getErrorType } from "../constants/error-types.js";

const DEFAULT_TYPE_BASE = "https://componode.io";

export interface InvalidParam {
  name: string;
  reason: string;
}

export interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: ErrorCode;
  message: string;
  details?: unknown;
  "invalid-params"?: InvalidParam[];
}

export interface CreateProblemOptions {
  message?: string;
  details?: unknown;
  invalidParams?: InvalidParam[];
  baseUrl?: string;
  status?: number;
}

export function createProblem(code: ErrorCode, options: CreateProblemOptions = {}): Problem {
  const { message, details, invalidParams, baseUrl = DEFAULT_TYPE_BASE, status: statusOverride } = options;
  const errorType = getErrorType(code);

  const title = errorType.title;
  const status = statusOverride ?? errorType.status;
  const detail = message ?? errorType.title;
  const finalMessage = message ?? errorType.title;

  const problem: Problem = {
    type: `${baseUrl}/problems/${code}`,
    title,
    status,
    detail,
    code,
    message: finalMessage,
  };

  if (details !== undefined) {
    problem.details = details;
  }

  if (invalidParams !== undefined && invalidParams.length > 0) {
    problem["invalid-params"] = invalidParams;
  }

  return problem;
}

export function buildProblemTypeUri(code: ErrorCode, baseUrl: string = DEFAULT_TYPE_BASE): string {
  return `${baseUrl}/problems/${code}`;
}
