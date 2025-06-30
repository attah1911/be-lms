import { Response } from "express";
import * as Yup from "yup";

type Pagination = {
    totalPages: number;
    current: number;
    total: number;
}

export default {
  success(res: Response, data: any, message: string): Response {
    return res.status(200).json({
      meta: {
        status: 200,
        message,
      },
      data,
    });
  },

  error(
    res: Response, 
    error: unknown, 
    message: string, 
    statusCode: number = 500
  ): Response {
    // Handle Yup validation errors
    if (error instanceof Yup.ValidationError) {
      return res.status(400).json({
        meta: {
          status: 400,
          message: error.errors[0] || message,
        },
        data: error.errors,
      });
    }

    // Handle other types of errors
    console.error('Error details:', error);
    return res.status(statusCode).json({
      meta: {
        status: statusCode,
        message: message || 'Internal server error',
      },
      data: null,
    });
  },

  unauthorized(res: Response, message: string = "unauthorized"): Response {
    return res.status(403).json({
      meta: {
        status: 403,
        message,
      },
      data: null,
    });
  },

  pagination(
    res: Response,
    data: any[],
    pagination: Pagination,
    message: string
  ): Response {
    return res.status(200).json({
        meta: {
            status: 200,
            message,
        },
        data,
        pagination
    });
  },
};
