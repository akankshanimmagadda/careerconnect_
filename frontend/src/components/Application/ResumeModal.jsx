import React from "react";
import API_BASE_URL from "../../config";

const ResumeModal = ({ imageUrl, onClose }) => {
  const fullImageUrl = imageUrl && !imageUrl.startsWith("http")
    ? `${API_BASE_URL}${imageUrl}`
    : imageUrl;

  const normalizedUrl = (fullImageUrl || "").split("?")[0].toLowerCase();
  const isPDF = normalizedUrl.endsWith(".pdf");
  const isDoc = normalizedUrl.endsWith(".doc") || normalizedUrl.endsWith(".docx");
  const isImage = [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) => normalizedUrl.endsWith(ext));
  const officeViewerUrl = isDoc && fullImageUrl
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullImageUrl)}`
    : "";

  if (!fullImageUrl) {
    return (
      <div className="resume-modal">
        <div className="modal-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
          <span className="close" onClick={onClose}>
            &times;
          </span>
          <h3 style={{ margin: 0 }}>Resume not available</h3>
          <p style={{ margin: 0, color: "#64748b" }}>No resume URL found for this applicant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="resume-modal">
      <div className="modal-content">
        <span className="close" onClick={onClose}>
          &times;
        </span>
        {isPDF ? (
          <iframe
            src={fullImageUrl}
            width="100%"
            height="100%"
            title="Resume PDF"
            style={{ border: "none" }}
          />
        ) : isImage ? (
          <img src={fullImageUrl} alt="resume" />
        ) : isDoc ? (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
            <iframe
              src={officeViewerUrl}
              width="100%"
              height="100%"
              title="Resume Document"
              style={{ border: "none", minHeight: "420px" }}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <a href={fullImageUrl} target="_blank" rel="noreferrer" className="view-btn" style={{ textDecoration: "none", padding: "8px 16px" }}>
                Open in New Tab
              </a>
            </div>
          </div>
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", textAlign: "center", padding: "20px" }}>
            <h3 style={{ margin: 0 }}>Preview not supported for this file</h3>
            <p style={{ margin: 0, color: "#64748b" }}>Open the resume directly in a new tab.</p>
            <a href={fullImageUrl} target="_blank" rel="noreferrer" className="view-btn" style={{ textDecoration: "none", padding: "8px 16px" }}>
              Open Resume
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeModal;


