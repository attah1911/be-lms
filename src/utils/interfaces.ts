import { Request } from "express";
import { UploadApiResponse } from "cloudinary";
import { Role } from "@prisma/client";

export interface IUserToken {
  id: string;
  role: Role;
}

export interface IReqUser extends Request {
  user?: IUserToken;
}

export interface IPaginationQuery {
  page: number;
  limit: number;
  search?: string;
}

export interface CloudinaryResponse extends UploadApiResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
}
