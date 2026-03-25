import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import { Application } from "../models/applicationSchema.js";
import { Job } from "../models/jobSchema.js";
import { sendEmail } from "../utils/mailer.js";
import { applicationConfirmationTemplate, statusUpdateTemplate, interviewNotificationTemplate } from "../utils/emailTemplates.js";
import { rankApplicantsWithAI } from "../services/aiService.js";
import { uploadResumeToS3 } from "../services/s3StorageService.js";

export const postApplication = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Employer") {
    return next(
      new ErrorHandler("Employer not allowed to access this resource.", 400)
    );
  }

  const { name, email, coverLetter, phone, address, jobId, useProfileResume } = req.body;
  let resumeData = {};

  if (useProfileResume === "true" || useProfileResume === true) {
    if (!req.user.resume) {
      return next(new ErrorHandler("No resume found in your profile!", 400));
    }
    resumeData = {
      public_id: `profile_resume_${req.user._id}`,
      url: req.user.resume,
    };
  } else {
    if (!req.files || Object.keys(req.files).length === 0) {
      return next(new ErrorHandler("Resume File Required!", 400));
    }

    const { resume } = req.files;
    const allowedFormats = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedFormats.includes(resume.mimetype)) {
      return next(
        new ErrorHandler("Invalid file type. Please upload a PDF or DOCX file.", 400)
      );
    }

    try {
      const uploadedResume = await uploadResumeToS3(resume);
      resumeData = {
        public_id: uploadedResume.key,
        url: uploadedResume.url,
      };
    } catch (error) {
      if (error.message && error.message.includes("AWS_")) {
        return next(new ErrorHandler("AWS S3 configuration error", 500));
      }
      return next(error);
    }
  }

  const applicantID = {
    user: req.user._id,
    role: "Job Seeker",
  };

  if (!jobId) {
    return next(new ErrorHandler("Job not found!", 404));
  }

  const jobDetails = await Job.findById(jobId);
  if (!jobDetails) {
    return next(new ErrorHandler("Job not found!", 404));
  }

  if (jobDetails.status !== "Approved" || jobDetails.expired) {
    return next(new ErrorHandler("This job is not open for applications right now.", 400));
  }

  // Check applicant limit
  if (jobDetails.applicantLimit > 0 && jobDetails.applicantsCount >= jobDetails.applicantLimit) {
    return next(new ErrorHandler("This job has reached its applicant limit and is now closed.", 400));
  }

  const already = await Application.findOne({
    "applicantID.user": req.user._id,
    job: jobId,
  });
  if (already) {
    return res.status(409).json({
      success: false,
      message: "Already applied",
      status: already.status,
      applicationId: already._id,
    });
  }

  const employerID = {
    user: jobDetails.postedBy,
    role: "Employer",
  };

  if (!name || !email || !phone || !address || !resumeData.url) {
    return next(new ErrorHandler("Please fill all required fields.", 400));
  }

  const application = await Application.create({
    name,
    email,
    coverLetter,
    phone,
    address,
    job: jobId,
    jobTitle: jobDetails.title,
    companyName: jobDetails.companyName,
    applicantID,
    employerID,
    resume: resumeData,
  });

  // Increment applicant count
  jobDetails.applicantsCount += 1;
  await jobDetails.save();

  try {
    await sendEmail({
      to: email,
      subject: `Application received for ${jobDetails.title}`,
      text: `Hi ${name},\n\nWe have received your application for the role '${jobDetails.title}' at ${jobDetails.companyName || 'the company'}.`,
      html: applicationConfirmationTemplate(name, jobDetails),
    });
  } catch (mailErr) {
    console.error("Failed to send application confirmation email:", mailErr.message);
  }

  res.status(200).json({
    success: true,
    message: "Application Submitted!",
    application,
  });
});

export const employerGetAllApplications = catchAsyncErrors(
  async (req, res, next) => {
    const { role } = req.user;
    if (role === "Job Seeker") {
      return next(
        new ErrorHandler("Job Seeker not allowed to access this resource.", 400)
      );
    }
    const { _id } = req.user;
    const { skills, experience, aiSort } = req.query;
    
    let query = { "employerID.user": _id };
    
    const applications = await Application.find(query)
      .populate('job', 'title companyName description qualifications responsibilities techStack category experienceLevel')
      .populate({
        path: 'applicantID.user',
        select: 'skills experience education bio'
      });

    let filteredApplications = applications;

    if (skills) {
      const skillArray = skills.split(",").map(s => s.trim().toLowerCase());
      filteredApplications = filteredApplications.filter(app => {
        const applicantSkills = app.applicantID.user.skills.map(s => s.toLowerCase());
        return skillArray.every(s => applicantSkills.includes(s));
      });
    }

    if (experience) {
      const expQuery = experience.toLowerCase();
      filteredApplications = filteredApplications.filter(app => {
        const applicantExp = app.applicantID.user.experience.map(e => 
          `${e.company} ${e.role} ${e.duration}`.toLowerCase()
        ).join(" ");
        return applicantExp.includes(expQuery);
      });
    }

    let finalApplications = filteredApplications;

    if (String(aiSort) === "true" && filteredApplications.length > 0) {
      const groupedByJob = filteredApplications.reduce((acc, app) => {
        const key = String(app.job?._id || app.job || "unknown");
        if (!acc[key]) acc[key] = [];
        acc[key].push(app);
        return acc;
      }, {});

      const rankedAll = [];
      for (const jobApps of Object.values(groupedByJob)) {
        const job = jobApps[0]?.job || {};
        const rankings = await rankApplicantsWithAI(job, jobApps);
        const rankingMap = new Map(rankings.map((rank) => [String(rank.applicationId), rank]));

        const enriched = jobApps.map((app) => {
          const rank = rankingMap.get(String(app._id));
          return {
            ...app.toObject(),
            aiScore: rank?.score ?? null,
            aiRecommendation: rank?.recommendation ?? null,
            aiReason: rank?.reason ?? null,
          };
        });

        enriched.sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1));
        rankedAll.push(...enriched);
      }

      finalApplications = rankedAll;
    }

    res.status(200).json({
      success: true,
      applications: finalApplications,
      aiSorted: String(aiSort) === "true",
    });
  }
);

export const jobseekerGetAllApplications = catchAsyncErrors(
  async (req, res, next) => {
    const { role } = req.user;
    if (role === "Employer") {
      return next(
        new ErrorHandler("Employer not allowed to access this resource.", 400)
      );
    }
    const { _id } = req.user;
      const applications = await Application.find({ "applicantID.user": _id }).populate('job', 'title companyName');
    res.status(200).json({
      success: true,
      applications,
    });
  }
);

export const jobseekerDeleteApplication = catchAsyncErrors(
  async (req, res, next) => {
    const { role } = req.user;
    if (role === "Employer") {
      return next(
        new ErrorHandler("Employer not allowed to access this resource.", 400)
      );
    }
    const { id } = req.params;
    const application = await Application.findById(id);
    if (!application) {
      return next(new ErrorHandler("Application not found!", 404));
    }
    await application.deleteOne();
    res.status(200).json({
      success: true,
      message: "Application Deleted!",
    });
  }
);

export const employerUpdateApplicationStatus = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Job Seeker") {
    return next(new ErrorHandler("Job Seeker not allowed to access this resource.", 400));
  }
  const { id } = req.params;
  const { status, interviewDate, interviewStatus, zoomLink } = req.body;
  const allowed = ["Applied", "In Review", "Accepted", "Rejected"];
  
  const application = await Application.findById(id);
  if (!application) return next(new ErrorHandler("Application not found!", 404));
  
  // ensure employer owns this application
  if (application.employerID.user.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Not authorized to update this application", 403));
  }

  if (status) {
    if (!allowed.includes(status)) return next(new ErrorHandler("Invalid status", 400));
    application.status = status;
  }

  if (interviewDate !== undefined) {
    application.interviewDate = interviewDate;
    if (interviewDate && !interviewStatus) {
      application.interviewStatus = "Scheduled";
    }
  }

  if (interviewStatus) {
    application.interviewStatus = interviewStatus;
  }

  if (zoomLink !== undefined) {
    application.zoomLink = zoomLink;
  }

  await application.save({ validateBeforeSave: false });

  // notify applicant about status change or interview scheduling
  try {
    if (application.interviewDate && (interviewDate || zoomLink || (interviewStatus && interviewStatus !== "Pending"))) {
      // Send interview notification if any interview detail is updated
      await sendEmail({
        to: application.email,
        subject: `Interview Update: ${application.jobTitle || 'the role'}`,
        html: interviewNotificationTemplate(
          application.name, 
          { title: application.jobTitle || 'the role', companyName: application.companyName }, 
          application.interviewDate, 
          application.zoomLink
        ),
      });
    } else if (status) {
      await sendEmail({
        to: application.email,
        subject: `Application status updated: ${status}`,
        text: `Hi ${application.name},\n\nYour application for the role has been updated to: ${status}.\n\nBest regards,\nJob Portal Team`,
        html: statusUpdateTemplate(application.name, { title: application.jobTitle || 'the role', companyName: application.companyName }, status),
      });
    }
  } catch (mailErr) {
    console.error("Failed to send status update email:", mailErr.message || mailErr);
  }
  res.status(200).json({ success: true, message: "Status updated", application });
});

export const checkApplicationStatus = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Employer") {
    return next(new ErrorHandler("Employer not allowed to access this resource.", 400));
  }
  const { jobId } = req.query;
  if (!jobId) return next(new ErrorHandler("jobId query param is required", 400));
  const application = await Application.findOne({ "applicantID.user": req.user._id, job: jobId });
  if (!application) {
    return res.status(200).json({ success: true, applied: false });
  }
  res.status(200).json({ success: true, applied: true, status: application.status, applicationId: application._id });
});
