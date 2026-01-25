import React, { useState, useEffect, useContext } from "react";
import { Context } from "../../main";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import axios from "../../api/axios";
import toast from "react-hot-toast";
import { FaDownload, FaPlay, FaSpinner } from "react-icons/fa";
import { MdFullscreen, MdFullscreenExit } from "react-icons/md";
import "./ResumePrepare.css";

const ResumePrepare = () => {
  const { isAuthorized, user } = useContext(Context);
  const navigateTo = useNavigate();
  
  const defaultLatex = `\\documentclass[a4paper,11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}

\\begin{document}

\\begin{center}
    {\\LARGE \\textbf{Your Name}}\\\\[5pt]
    \\textit{Email: your.email@example.com | Phone: (123) 456-7890}\\\\
    \\textit{LinkedIn: linkedin.com/in/yourprofile | GitHub: github.com/yourprofile}
\\end{center}

\\section*{Summary}
A brief professional summary highlighting your key skills and experience.

\\section*{Education}
\\textbf{University Name} \\hfill \\textit{Graduation Date}\\\\
Degree in Major \\hfill GPA: X.XX/4.00

\\section*{Experience}
\\textbf{Job Title} \\hfill \\textit{Start Date - End Date}\\\\
\\textit{Company Name, Location}
\\begin{itemize}[leftmargin=*,noitemsep]
    \\item Achievement or responsibility highlighting impact
    \\item Another key accomplishment with measurable results
    \\item Technical skills or tools used in this role
\\end{itemize}

\\textbf{Previous Job Title} \\hfill \\textit{Start Date - End Date}\\\\
\\textit{Previous Company, Location}
\\begin{itemize}[leftmargin=*,noitemsep]
    \\item Key responsibility or achievement
    \\item Another significant contribution
\\end{itemize}

\\section*{Skills}
\\textbf{Programming Languages:} Python, JavaScript, Java, C++\\\\
\\textbf{Technologies:} React, Node.js, MongoDB, SQL, Git\\\\
\\textbf{Soft Skills:} Team Leadership, Communication, Problem Solving

\\section*{Projects}
\\textbf{Project Name} \\hfill \\textit{Date}
\\begin{itemize}[leftmargin=*,noitemsep]
    \\item Brief description of the project and your role
    \\item Technologies used and impact/results achieved
\\end{itemize}

\\section*{Certifications}
\\begin{itemize}[leftmargin=*,noitemsep]
    \\item Certification Name - Issuing Organization, Year
    \\item Another Certification - Issuing Organization, Year
\\end{itemize}

\\end{document}`;

  const [latexCode, setLatexCode] = useState(defaultLatex);
  const [pdfUrl, setPdfUrl] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("pdf"); // pdf or logs

  useEffect(() => {
    if (!isAuthorized) {
      navigateTo("/login");
    } else if (user?.role !== "Job Seeker") {
      toast.error("This feature is only available for Job Seekers");
      navigateTo("/");
    }
  }, [isAuthorized, user, navigateTo]);

  useEffect(() => {
    // Load saved LaTeX code from localStorage
    const savedCode = localStorage.getItem("resumeLatexCode");
    if (savedCode) {
      setLatexCode(savedCode);
    }
  }, []);

  const handleEditorChange = (value) => {
    setLatexCode(value);
    // Auto-save to localStorage
    localStorage.setItem("resumeLatexCode", value);
  };

  const compileLatex = async () => {
    setIsCompiling(true);
    setLogs([]);
    setActiveTab("pdf");

    try {
      const response = await axios.post(
        "/api/v1/resume/compile",
        { latexCode },
        {
          responseType: "blob",
        }
      );

      // Create a blob URL for the PDF
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      // Revoke old URL to prevent memory leaks
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      
      setPdfUrl(url);
      toast.success("Resume compiled successfully!");
      setLogs(["Compilation successful!"]);
    } catch (error) {
      console.error("Compilation error:", error);
      const errorMessage = error.response?.data?.message || "Compilation failed";
      toast.error(errorMessage);
      setLogs([
        "Compilation failed!",
        errorMessage,
        "Please check your LaTeX syntax and try again."
      ]);
      setActiveTab("logs");
    } finally {
      setIsCompiling(false);
    }
  };

  const downloadPDF = () => {
    if (!pdfUrl) {
      toast.error("Please compile your resume first");
      return;
    }

    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = "resume.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Resume downloaded!");
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isAuthorized || user?.role !== "Job Seeker") {
    return null;
  }

  return (
    <div className={`resume-prepare-container ${isFullscreen ? "fullscreen" : ""}`}>
      <div className="resume-header">
        <h1>Resume Prepare</h1>
        <div className="header-actions">
          <button
            className="compile-btn"
            onClick={compileLatex}
            disabled={isCompiling}
          >
            {isCompiling ? (
              <>
                <FaSpinner className="spinning" /> Compiling...
              </>
            ) : (
              <>
                <FaPlay /> Compile
              </>
            )}
          </button>
          <button
            className="download-btn"
            onClick={downloadPDF}
            disabled={!pdfUrl || isCompiling}
          >
            <FaDownload /> Download PDF
          </button>
          <button className="fullscreen-btn" onClick={toggleFullscreen}>
            {isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
          </button>
        </div>
      </div>

      <div className="resume-content">
        <div className="editor-panel">
          <div className="panel-header">
            <h3>LaTeX Editor</h3>
            <span className="editor-hint">Write your resume in LaTeX</span>
          </div>
          <Editor
            height="100%"
            defaultLanguage="latex"
            theme="vs-dark"
            value={latexCode}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: "on",
              tabSize: 2,
            }}
          />
        </div>

        <div className="preview-panel">
          <div className="panel-header">
            <div className="tabs">
              <button
                className={activeTab === "pdf" ? "active" : ""}
                onClick={() => setActiveTab("pdf")}
              >
                PDF Preview
              </button>
              <button
                className={activeTab === "logs" ? "active" : ""}
                onClick={() => setActiveTab("logs")}
              >
                Logs
              </button>
            </div>
          </div>

          <div className="preview-content">
            {activeTab === "pdf" ? (
              pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  title="PDF Preview"
                  className="pdf-viewer"
                />
              ) : (
                <div className="empty-state">
                  <p>Click "Compile" to preview your resume</p>
                </div>
              )
            ) : (
              <div className="logs-content">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div key={index} className="log-line">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>No logs available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumePrepare;
