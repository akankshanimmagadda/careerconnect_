import express from "express";
import { compileLatex, compileLatexOnline } from "../controllers/resumeController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// Compile LaTeX to PDF (requires pdflatex installed)
router.post("/compile", isAuthenticated, compileLatex);

// Alternative: Compile using online service (fallback)
router.post("/compile-online", isAuthenticated, compileLatexOnline);

export default router;
