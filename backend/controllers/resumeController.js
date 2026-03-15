import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const execPromise = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compileWithLatexOnline = async (latexCode) => {
  const endpoint = `https://latexonline.cc/compile?text=${encodeURIComponent(latexCode)}&command=pdflatex&force=true`;
  const response = await fetch(endpoint, { method: "GET" });
  const rawBody = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok || !contentType.includes("application/pdf")) {
    const bodyText = rawBody.toString("utf-8");
    const error = new Error(bodyText || `Latex.Online failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return rawBody;
};

// Compile LaTeX to PDF - Try local first, fallback to online
export const compileLatex = catchAsyncErrors(async (req, res, next) => {
  const { latexCode } = req.body;

  if (!latexCode) {
    return next(new ErrorHandler("LaTeX code is required", 400));
  }

  // Try to use online service first (more reliable in environments without local pdflatex)
  try {
    const pdfBuffer = await compileWithLatexOnline(latexCode);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=resume.pdf");
    return res.send(pdfBuffer);
  } catch (onlineError) {
    const status = Number(onlineError?.status || 0);
    const onlineMessage = onlineError?.message || "Online LaTeX compilation failed";

    if (status >= 400 && status < 500) {
      return next(new ErrorHandler(onlineMessage, 400));
    }

    console.error("Online LaTeX compilation failed, trying local:", onlineError);
  }

  // Fallback to local compilation if available
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "latex-"));
  const texFilePath = path.join(tempDir, "resume.tex");
  const pdfFilePath = path.join(tempDir, "resume.pdf");

  try {
    // Write LaTeX code to file
    await fs.writeFile(texFilePath, latexCode, "utf-8");

    // Compile LaTeX to PDF using pdflatex
    // Run twice to resolve references
    try {
      await execPromise(`pdflatex -interaction=nonstopmode -output-directory="${tempDir}" "${texFilePath}"`, {
        timeout: 30000, // 30 second timeout
      });

      // Second pass for references
      await execPromise(`pdflatex -interaction=nonstopmode -output-directory="${tempDir}" "${texFilePath}"`, {
        timeout: 30000,
      });
    } catch (execError) {
      // Check if PDF was still generated despite errors
      const pdfExists = await fs.access(pdfFilePath).then(() => true).catch(() => false);
      
      if (!pdfExists) {
        const stderrText = `${execError?.stderr || ""} ${execError?.message || ""}`.toLowerCase();
        const compilerMissing =
          execError?.code === "ENOENT" ||
          stderrText.includes("not recognized") ||
          stderrText.includes("command not found");

        if (compilerMissing) {
          return next(
            new ErrorHandler(
              "LaTeX compiler is not available on the server. Please install TeX (e.g., MiKTeX/TeX Live) or use the online compiler endpoint.",
              503
            )
          );
        }

        // Read the log file for error details
        const logFilePath = path.join(tempDir, "resume.log");
        let errorDetails = "LaTeX compilation failed. Please check your LaTeX syntax.";
        
        try {
          const logContent = await fs.readFile(logFilePath, "utf-8");
          // Extract relevant error messages
          const errorMatch = logContent.match(/! .*/g);
          if (errorMatch) {
            errorDetails = errorMatch.slice(0, 3).join("\n");
          }
        } catch (logError) {
          // Log file not readable
        }

        return next(new ErrorHandler(errorDetails, 400));
      }
    }

    // Read the PDF file
    const pdfBuffer = await fs.readFile(pdfFilePath);

    // Send PDF as response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=resume.pdf");
    res.send(pdfBuffer);

  } catch (error) {
    console.error("LaTeX compilation error:", error);
    return next(new ErrorHandler("Failed to compile LaTeX code. Please check your syntax and try again.", 500));
  } finally {
    // Clean up temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error("Error cleaning up temp files:", cleanupError);
    }
  }
});

// Alternative: Using online LaTeX compilation service (for systems without pdflatex)
export const compileLatexOnline = catchAsyncErrors(async (req, res, next) => {
  const { latexCode } = req.body;

  if (!latexCode) {
    return next(new ErrorHandler("LaTeX code is required", 400));
  }

  try {
    const pdfBuffer = await compileWithLatexOnline(latexCode);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=resume.pdf");
    res.send(pdfBuffer);

  } catch (error) {
    console.error("Online LaTeX compilation error:", error);
    return next(new ErrorHandler(error.message || "Failed to compile LaTeX code using online service. Please check your syntax and try again.", 500));
  }
});
