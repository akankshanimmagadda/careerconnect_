import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

let s3Client;

const getRequiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for AWS S3 uploads`);
  }
  return value;
};

const getS3Client = () => {
  if (s3Client) return s3Client;

  const region = getRequiredEnv("AWS_REGION");
  const accessKeyId = getRequiredEnv("AWS_ACCESS_KEY_ID");
  const secretAccessKey = getRequiredEnv("AWS_SECRET_ACCESS_KEY");

  s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3Client;
};

const sanitizeFileName = (fileName = "file") =>
  fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

const getPublicBaseUrl = (bucket, region) => {
  const configured = process.env.AWS_S3_PUBLIC_BASE_URL;
  if (configured && configured.trim()) {
    return configured.trim().replace(/\/$/, "");
  }
  return `https://${bucket}.s3.${region}.amazonaws.com`;
};

const getFileBuffer = (file) => {
  if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
    return fs.readFileSync(file.tempFilePath);
  }
  if (file.data) {
    return file.data;
  }
  throw new Error("Uploaded file data is not available");
};

export const uploadResumeToS3 = async (file, folder = "careerconnect/resumes") => {
  const bucket = getRequiredEnv("AWS_S3_BUCKET_NAME");
  const region = getRequiredEnv("AWS_REGION");

  const safeName = sanitizeFileName(file?.name || "resume");
  const objectKey = `${folder}/${Date.now()}_${safeName}`;
  const body = getFileBuffer(file);

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: body,
      ContentType: file?.mimetype || "application/octet-stream",
    })
  );

  const encodedKey = objectKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return {
    key: objectKey,
    url: `${getPublicBaseUrl(bucket, region)}/${encodedKey}`,
  };
};
