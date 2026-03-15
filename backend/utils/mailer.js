import nodemailer from "nodemailer";

let transporter;
let usingTestAccount = false;

const normalizeAppPassword = (value = "") => value.replace(/\s+/g, "").trim();

const resolveFromAddress = () => {
  const rawFrom = (process.env.SMTP_FROM || "").trim();
  const fallback = (process.env.SMTP_USER || "").trim();

  if (!rawFrom) return fallback || undefined;

  const fromLooksLikeMailbox = rawFrom.includes("<") && rawFrom.includes(">");
  const fromLooksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawFrom);

  if (fromLooksLikeMailbox || fromLooksLikeEmail) return rawFrom;

  return fallback || undefined;
};

const createTransporter = async () => {
  const hasSmtpConfig =
    Boolean(process.env.SMTP_HOST) &&
    Boolean(process.env.SMTP_USER) &&
    Boolean(process.env.SMTP_PASS);

  // Prefer explicit SMTP config from env
  if (hasSmtpConfig) {
    console.log("[MAILER] Creating SMTP transporter with Gmail credentials");
    try {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: normalizeAppPassword(process.env.SMTP_PASS),
        },
      });
      
      // Verify connection
      await transporter.verify();
      console.log("[MAILER] SMTP connection verified successfully");
      usingTestAccount = false;
      return transporter;
    } catch (err) {
      console.error("[MAILER] SMTP connection failed:", err.message);
      throw new Error("SMTP verification failed. Check SMTP_HOST/PORT/USER/PASS settings.");
    }
  }

  // Fallback: create an Ethereal test account only when SMTP config is absent
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    usingTestAccount = true;
    console.warn("[MAILER] Using Ethereal test account for email (dev only)");
    return transporter;
  } catch (err) {
    console.error("[MAILER] Failed to create Ethereal account:", err.message);
    throw err;
  }
};

export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    if (!transporter) await createTransporter();
    const from = resolveFromAddress() || (usingTestAccount ? "no-reply@jobportal.test" : undefined);

    if (!to) {
      throw new Error("Recipient email is missing");
    }
    
    console.log(`[EMAIL] Sending to ${to} from ${from}`);
    const info = await transporter.sendMail({ from, to, subject, text, html });

    if (usingTestAccount) {
      try {
        const preview = nodemailer.getTestMessageUrl(info);
        console.info("[EMAIL] Ethereal preview URL:", preview);
      } catch (err) {
        console.log("[EMAIL] Could not generate preview URL");
      }
    } else {
      console.log(`[EMAIL] Successfully sent to ${to} (Message ID: ${info.messageId})`);
    }

    return info;
  } catch (error) {
    console.error("[EMAIL] Failed to send email:", {
      to,
      error: error.message,
      code: error.code,
    });
    throw error;
  }
};

export default sendEmail;
