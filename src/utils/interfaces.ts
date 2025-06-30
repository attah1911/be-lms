import { Request } from "express";
import { Types } from "mongoose";
import { User } from "../models/user.model";
import { UploadApiResponse } from "cloudinary";

export interface IUserToken
  extends Omit<
    User,
    | "password"
    | "activationToken"
    | "isActive"
    | "email"
    | "fullName"
    | "profilePicture"
    | "username"
  > {
  id?: Types.ObjectId;
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
