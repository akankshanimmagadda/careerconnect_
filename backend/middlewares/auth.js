import { User } from "../models/userSchema.js";
import { catchAsyncErrors } from "./catchAsyncError.js";
import ErrorHandler from "./error.js";
import jwt from "jsonwebtoken";

export const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  // Check for token in cookies first, then in Authorization header
  let token = req.cookies.token;
  
  if (!token && req.headers.authorization) {
    // Check for Bearer token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
  }
  
  if (!token) {
    return next(new ErrorHandler("User Not Authorized", 401));
  }
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  req.user = await User.findById(decoded.id);

  if (req.user && !req.user.isEmailVerified) {
    return next(new ErrorHandler("Please verify your email to access this resource.", 401));
  }

  next();
});
