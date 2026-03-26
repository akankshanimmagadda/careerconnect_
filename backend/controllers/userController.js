import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { User } from "../models/userSchema.js";
import ErrorHandler from "../middlewares/error.js";
import { sendToken } from "../utils/jwtToken.js";
import mongoose from "mongoose";
import { Job } from "../models/jobSchema.js";
import { uploadResumeToS3 } from "../services/s3StorageService.js";

export const register = catchAsyncErrors(async (req, res, next) => {
  let { name, email, password, role } = req.body;
  if (typeof email === "string") email = email.trim().toLowerCase();
  if (typeof name === "string") name = name.trim();
  if (!name || !email || !password || !role) {
    return next(new ErrorHandler("Please fill full form!", 400));
  }

  // Normalize role to proper case
  role = role.trim();
  if (role.toLowerCase() === "job seeker") role = "Job Seeker";
  else if (role.toLowerCase() === "employer") role = "Employer";
  else if (role.toLowerCase() === "admin") {
    return next(new ErrorHandler("Registration as Admin is not allowed.", 400));
  } else {
    return next(new ErrorHandler("Invalid role selected.", 400));
  }

  // enforce password policy: min 8 chars, at least 1 uppercase, 1 digit, 1 special char
  const passwordPolicy = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};:'"\\|,.<>\/?`~]).{8,}$/;
  if (!passwordPolicy.test(password)) {
    return next(new ErrorHandler("Password must be at least 8 characters and include an uppercase letter, a number, and a special character.", 400));
  }

  const isEmail = await User.findOne({ email });
  if (isEmail) {
    return next(new ErrorHandler("Email already registered!", 400));
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    isEmailVerified: true,
  });

  res.status(201).json({
    success: true,
    message: "Registration successful! You can now login.",
    email: user.email
  });
});

export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return next(new ErrorHandler("Please provide email, password and role!", 400));
  }
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid Email Or Password.", 400));
  }

  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHandler("Invalid Email Or Password!", 400));
  }
  if (user.role.toLowerCase() !== role.toLowerCase()) {
    return next(
      new ErrorHandler(`User with provided email and ${role} role not found!`, 404)
    );
  }
  sendToken(user, 200, res, "User Logged In Successfully!");
});

export const logout = catchAsyncErrors(async (req, res, next) => {
  res
    .status(201)
    .cookie("token", "", {
      httpOnly: true,
      expires: new Date(Date.now()),
    })
    .json({
      success: true,
      message: "Logged Out Successfully !",
    });
});

export const getUser = catchAsyncErrors((req, res, next) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    user,
  });
});

export const updateProfile = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;
  const { 
    name, 
    phone, 
    bio, 
    skills, 
    location, 
    education, 
    experience, 
    linkedin, 
    github, 
    portfolio,
    companyDetails
  } = req.body;

  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User not found", 404));

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (bio !== undefined) user.bio = bio;
  if (location !== undefined) user.location = location;
  if (linkedin !== undefined) user.linkedin = linkedin;
  if (github !== undefined) user.github = github;
  if (portfolio !== undefined) user.portfolio = portfolio;

  if (skills) {
    user.skills = Array.isArray(skills) ? skills : skills.split(",").map(s => s.trim());
  }

  if (education) {
    user.education = typeof education === 'string' ? JSON.parse(education) : education;
  }

  if (experience) {
    user.experience = typeof experience === 'string' ? JSON.parse(experience) : experience;
  }

  if (companyDetails !== undefined && user.role === "Employer") {
    const parsedCompanyDetails = typeof companyDetails === "string" ? JSON.parse(companyDetails) : companyDetails;
    user.companyDetails = {
      companyName: parsedCompanyDetails?.companyName || "",
      designation: parsedCompanyDetails?.designation || "",
      industry: parsedCompanyDetails?.industry || "",
      website: parsedCompanyDetails?.website || "",
      companySize: parsedCompanyDetails?.companySize || "",
      headquarters: parsedCompanyDetails?.headquarters || "",
      aboutCompany: parsedCompanyDetails?.aboutCompany || "",
    };
  }

  // Handle resume upload
  if (req.files && req.files.resume) {
    const resume = req.files.resume;
    const allowedFormats = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedFormats.includes(resume.mimetype)) {
      return next(new ErrorHandler("Invalid file type. Please upload a PDF or DOCX file.", 400));
    }

    const uploadedResume = await uploadResumeToS3(resume);
    user.resume = uploadedResume.url;
  }

  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Profile updated", user });
});

export const toggleAvailability = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  user.isAvailableForMockInterview = !user.isAvailableForMockInterview;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    isAvailableForMockInterview: user.isAvailableForMockInterview,
    message: `You are now ${user.isAvailableForMockInterview ? "available" : "unavailable"} for mock interviews`,
  });
});

export const getAvailableJobSeekers = catchAsyncErrors(async (req, res, next) => {
  const users = await User.find({
    role: "Job Seeker",
    isOnline: true,
    isAvailableForMockInterview: true,
    _id: { $ne: req.user._id },
  }).select("name email skills bio location");

  res.status(200).json({
    success: true,
    users,
  });
});

// ADMIN CONTROLLERS

export const adminGetAllUsers = catchAsyncErrors(async (req, res, next) => {
  if (req.user.role.toLowerCase() !== "admin") {
    return next(new ErrorHandler("Access denied. Admin only.", 403));
  }
  const users = await User.find({ role: { $nin: ["Admin", "admin"] } }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, users });
});

export const adminUpdateUserStatus = catchAsyncErrors(async (req, res, next) => {
  if (req.user.role.toLowerCase() !== "admin") {
    return next(new ErrorHandler("Access denied. Admin only.", 403));
  }
  const { id } = req.params;
  const { status } = req.body;
  const user = await User.findByIdAndUpdate(id, { status }, { new: true });
  if (!user) return next(new ErrorHandler("User not found", 404));
  res.status(200).json({ success: true, message: `User status updated to ${status}`, user });
});

export const adminDeleteUser = catchAsyncErrors(async (req, res, next) => {
  if (req.user.role.toLowerCase() !== "admin") {
    return next(new ErrorHandler("Access denied. Admin only.", 403));
  }
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  // Cleanup associated data
  if (user.role === "Employer") {
    await Job.deleteMany({ postedBy: id });
    await mongoose.model("Application").deleteMany({ "employerID.user": id });
  } else if (user.role === "Job Seeker") {
    await mongoose.model("Application").deleteMany({ "applicantID.user": id });
  }

  await user.deleteOne();
  res.status(200).json({ success: true, message: "User and associated data deleted successfully" });
});

export const adminGetStats = catchAsyncErrors(async (req, res, next) => {
  if (req.user.role.toLowerCase() !== "admin") {
    return next(new ErrorHandler("Access denied. Admin only.", 403));
  }
  const totalUsers = await User.countDocuments({ role: { $nin: ["Admin", "admin"] } });
  const totalJobSeekers = await User.countDocuments({ role: "Job Seeker" });
  const totalEmployers = await User.countDocuments({ role: "Employer" });
  const totalJobs = await Job.countDocuments();
  const totalApplications = await mongoose.model("Application").countDocuments();

  res.status(200).json({
    success: true,
    stats: {
      totalUsers,
      totalJobSeekers,
      totalEmployers,
      totalJobs,
      totalApplications
    }
  });
});
