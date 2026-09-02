import { NextFunction, Request, Response } from "express";
import { getUserData } from "../utils/jwt";
import { IReqUser } from "../utils/interfaces";
import response from "../utils/response";

export default (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.headers?.authorization;

  if (!authorization) {
    return response.unauthenticated(res);
  }

  const [prefix, token] = authorization.split(" ");

  if (!(prefix === "Bearer" && token)) {
    return response.unauthenticated(res);
  }

  const user = getUserData(token);

  if (!user) {
    return response.unauthenticated(res);
  }

  (req as IReqUser).user = user;

  next();
};