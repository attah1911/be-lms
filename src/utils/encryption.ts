import crypto from "crypto";
import environment from "../config/environment";

export const encrypt = (password: string): string => {
  if (!environment.JWT_SECRET) {
    throw new Error("JWT_SECRET is required but not set in environment variables");
  }

  const encrypted = crypto
    .pbkdf2Sync(password, environment.JWT_SECRET, 1000, 64, "sha512")
    .toString("hex");
  return encrypted;
};
