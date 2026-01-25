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

// Compile LaTeX to PDF - Try local first, fallback to online
export const compileLatex = catchAsyncErrors(async (req, res, next) => {
  const { latexCode } = req.body;

  if (!latexCode) {
    return next(new ErrorHandler("LaTeX code is required", 400));
  }

  // Try to use online service first (more reliable)
  try {
    // Using LaTeX.Online API (public service)
    const formData = new URLSearchParams();
    formData.append('filecontents[]', latexCode);
    formData.append('filename[]', 'resume.tex');
    
    const response = await fetch("https://latexonline.cc/compile?command=pdflatex", {
      method: "POST",
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.ok) {
      const pdfBuffer = await response.arrayBuffer();
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline; filename=resume.pdf");
      return res.send(Buffer.from(pdfBuffer));
    }
  } catch (onlineError) {
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
    // Using LaTeX.Online API
    const formData = new URLSearchParams();
    formData.append('filecontents[]', latexCode);
    formData.append('filename[]', 'resume.tex');
    
    const response = await fetch("https://latexonline.cc/compile?command=pdflatex", {
      method: "POST",
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000,
    });

    if (!response.ok) {
      return next(new ErrorHandler("Failed to compile LaTeX code. Please check your syntax.", 500));
    }

    const pdfBuffer = await response.arrayBuffer();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=resume.pdf");
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error("Online LaTeX compilation error:", error);
    return next(new ErrorHandler("Failed to compile LaTeX code using online service. Please check your syntax and try again.", 500));
  }
});
