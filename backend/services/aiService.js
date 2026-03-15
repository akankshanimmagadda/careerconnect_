import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const OPENAI_EMBEDDING_URL = "https://api.openai.com/v1/embeddings";

// Function to get embeddings from OpenAI
export const getEmbeddings = async (text) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your_openai_api_key_here") {
    throw new Error("OpenAI API Key not found");
  }
  try {
    const response = await axios.post(
      OPENAI_EMBEDDING_URL,
      {
        input: text,
        model: "text-embedding-ada-002", // or another embedding model
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    return response.data.data[0].embedding; // Return the embedding vector
  } catch (error) {
    console.error("Error fetching embeddings:", error);
    throw new Error("Failed to fetch embeddings");
  }
};

// Function to compute cosine similarity between two vectors
export const cosineSimilarity = (vecA, vecB) => {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must be of the same length");
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dotProduct / (normA * normB);
};

export const analyzeResumeWithAI = async (resumeText, jobDescription) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey && geminiKey !== "your_gemini_api_key_here") {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const prompt = `You are an advanced Applicant Tracking System (ATS) AI. Your task is to strictly analyze a candidate's resume against a specific job description.

      Evaluation Rules:
      - Compare skills, tools, technologies, experience, and role relevance.
      - Consider common synonyms (e.g., React.js = React, JS = JavaScript).
      - Do NOT assume any skill or experience that is not explicitly mentioned.
      - Be strict and realistic like a real ATS used by companies.
      - Base the score primarily on skill match, then experience relevance.

      Job Description: ${jobDescription}
      
      Resume Text: ${resumeText}
      
      Provide the analysis in the following JSON format:
      {
        "score": (0-100 match score based on strict evaluation rules),
        "resumeQualityScore": (0-100 overall quality based on formatting and content),
        "matchedKeywords": ["list", "of", "matched", "keywords/skills"],
        "missingKeywords": ["list", "of", "missing", "important", "keywords/skills"],
        "suggestions": [
          {
            "section": "Section Name",
            "issue": "Description of issue",
            "priority": "high/medium/low",
            "suggestion": "How to fix it",
            "example": "Concrete example"
          }
        ],
        "summary": {
          "strengths": ["strength1", "strength2"],
          "weaknesses": ["weakness1", "weakness2"]
        }
      }`;

      const candidateModels = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-2.0-flash",
      ];

      const parseAIJson = (rawText) => {
        const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        try {
          return JSON.parse(cleaned);
        } catch {
          const match = cleaned.match(/\{[\s\S]*\}/);
          if (!match) throw new Error("AI response did not contain valid JSON");
          return JSON.parse(match[0]);
        }
      };

      let lastError;
      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();

          const parsed = parseAIJson(text);
          if (parsed && typeof parsed === "object") {
            return parsed;
          }
        } catch (error) {
          lastError = error;
          console.warn(`Gemini resume analysis failed on ${modelName}:`, error.message);
        }
      }

      throw lastError || new Error("Gemini resume analysis failed on all candidate models");
    } catch (error) {
      console.error("Gemini Analysis Error:", error.message);
      // Fallback to OpenAI if Gemini fails
    }
  }

  if (!openaiKey || openaiKey === "your_openai_api_key_here") {
    console.warn("AI API Keys not found. Falling back to heuristic analysis.");
    return null;
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an advanced Applicant Tracking System (ATS) AI. Your task is to strictly analyze a candidate's resume against a specific job description.

            Evaluation Rules:
            - Compare skills, tools, technologies, experience, and role relevance.
            - Consider common synonyms (e.g., React.js = React, JS = JavaScript).
            - Do NOT assume any skill or experience that is not explicitly mentioned.
            - Be strict and realistic like a real ATS used by companies.
            - Base the score primarily on skill match, then experience relevance.`
          },
          {
            role: "user",
            content: `
            Job Description: ${jobDescription}
            
            Resume Text: ${resumeText}
            
            Provide the analysis in the following JSON format:
            {
              "score": (0-100 match score based on strict evaluation rules),
              "resumeQualityScore": (0-100 overall quality based on formatting and content),
              "matchedKeywords": ["list", "of", "matched", "keywords/skills"],
              "missingKeywords": ["list", "of", "missing", "important", "keywords/skills"],
              "suggestions": [
                {
                  "section": "Section Name",
                  "issue": "Description of issue",
                  "priority": "high/medium/low",
                  "suggestion": "How to fix it",
                  "example": "Concrete example"
                }
              ],
              "summary": {
                "strengths": ["strength1", "strength2"],
                "weaknesses": ["weakness1", "weakness2"]
              }
            }`
          }
        ],
        response_format: { type: "json_object" }
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
      }
    );

    return JSON.parse(response.data.choices[0].message.content);
  } catch (error) {
    console.error("OpenAI Analysis Error:", error.response?.data || error.message);
    return null;
  }
};

export const extractStructuredDataFromResume = async (resumeText) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey && geminiKey !== "your_gemini_api_key_here") {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `You are a professional resume parser. Extract structured data from the provided resume text into JSON format.
      
      Resume Text: ${resumeText}
      
      Extract the following into JSON:
      {
        "skills": ["skill1", "skill2"],
        "experienceYears": (number),
        "education": ["degree1", "degree2"],
        "jobTitles": ["title1", "title2"],
        "summary": "brief summary"
      }`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(text);
    } catch (error) {
      console.error("Gemini Extraction Error:", error.message);
    }
  }

  if (!openaiKey || openaiKey === "your_openai_api_key_here") {
    return null;
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional resume parser. Extract structured data from the provided resume text into JSON format."
          },
          {
            role: "user",
            content: `
            Resume Text: ${resumeText}
            
            Extract the following into JSON:
            {
              "skills": ["skill1", "skill2"],
              "experienceYears": (number),
              "education": ["degree1", "degree2"],
              "jobTitles": ["title1", "title2"],
              "summary": "brief summary"
            }`
          }
        ],
        response_format: { type: "json_object" }
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
      }
    );

    return JSON.parse(response.data.choices[0].message.content);
  } catch (error) {
    console.error("OpenAI Extraction Error:", error.response?.data || error.message);
    return null;
  }
};

export const generateMockQuestions = async (category) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey && geminiKey !== "your_gemini_api_key_here") {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `You are a professional interviewer. Generate 5 relevant interview questions for a specific job category: ${category}. Provide the questions as a JSON array of strings in this format: { "questions": ["q1", "q2", "q3", "q4", "q5"] }`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(text);
      return data.questions || data;
    } catch (error) {
      console.error("Gemini Question Generation Error:", error.message);
    }
  }

  if (!openaiKey || openaiKey === "your_openai_api_key_here") {
    return ["Tell me about yourself.", "Why do you want to work in this field?", "What are your strengths?"];
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional interviewer. Generate 5 relevant interview questions for a specific job category."
          },
          {
            role: "user",
            content: `Job Category: ${category}. Provide the questions as a JSON array of strings.`
          }
        ],
        response_format: { type: "json_object" }
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
      }
    );

    const data = JSON.parse(response.data.choices[0].message.content);
    return data.questions || data;
  } catch (error) {
    console.error("OpenAI Question Generation Error:", error.response?.data || error.message);
    return ["Tell me about yourself.", "Why do you want to work in this field?", "What are your strengths?"];
  }
};

export const evaluateMockAnswer = async (question, answer) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey && geminiKey !== "your_gemini_api_key_here") {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `You are a professional interviewer. Evaluate the candidate's answer to an interview question.
      
      Question: ${question}
      Answer: ${answer}
      
      Provide feedback and a score (0-100) in JSON format: { "feedback": "...", "score": 85 }`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(text);
    } catch (error) {
      console.error("Gemini Evaluation Error:", error.message);
    }
  }

  if (!openaiKey || openaiKey === "your_openai_api_key_here") {
    return { feedback: "Good effort! Keep practicing.", score: 70 };
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional interviewer. Evaluate the candidate's answer to an interview question."
          },
          {
            role: "user",
            content: `Question: ${question}\nAnswer: ${answer}\n\nProvide feedback and a score (0-100) in JSON format: { "feedback": "...", "score": 85 }`
          }
        ],
        response_format: { type: "json_object" }
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
      }
    );

    return JSON.parse(response.data.choices[0].message.content);
  } catch (error) {
    console.error("OpenAI Evaluation Error:", error.response?.data || error.message);
    return { feedback: "Good effort! Keep practicing.", score: 70 };
  }
};

export const generateDSAProblem = async (category) => {
  const openaiKey = process.env.OPENAI_API_KEY;
  const fallbackProblems = [
    {
      question: "Two Sum",
      problemStatement: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
      constraints: "2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9, -10^9 <= target <= 10^9",
      inputFormat: "Array of integers, target integer",
      outputFormat: "Array of two indices",
      sampleTestCases: "Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]",
      testCases: [
        { input: "[2,7,11,15], 9", expectedOutput: "[0,1]", isHidden: false },
        { input: "[3,2,4], 6", expectedOutput: "[1,2]", isHidden: true },
        { input: "[3,3], 6", expectedOutput: "[0,1]", isHidden: true }
      ]
    },
    {
      question: "Reverse String",
      problemStatement: "Write a function that reverses a string. The input string is given as an array of characters s.",
      constraints: "1 <= s.length <= 10^5, s[i] is a printable ascii character.",
      inputFormat: "Array of characters",
      outputFormat: "None (Modify in-place or return reversed array)",
      sampleTestCases: "Input: s = [\"h\",\"e\",\"l\",\"l\",\"o\"]\nOutput: [\"o\",\"l\",\"l\",\"e\",\"h\"]",
      testCases: [
        { input: "[\"h\",\"e\",\"l\",\"l\",\"o\"]", expectedOutput: "[\"o\",\"l\",\"l\",\"e\",\"h\"]", isHidden: false },
        { input: "[\"H\",\"a\",\"n\",\"n\",\"a\",\"h\"]", expectedOutput: "[\"h\",\"a\",\"n\",\"n\",\"a\",\"H\"]", isHidden: true }
      ]
    },
    {
      question: "Contains Duplicate",
      problemStatement: "Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.",
      constraints: "1 <= nums.length <= 10^5, -10^9 <= nums[i] <= 10^9",
      inputFormat: "Array of integers",
      outputFormat: "Boolean",
      sampleTestCases: "Input: nums = [1,2,3,1]\nOutput: true",
      testCases: [
        { input: "[1,2,3,1]", expectedOutput: "true", isHidden: false },
        { input: "[1,2,3,4]", expectedOutput: "false", isHidden: true }
      ]
    }
  ];

  if (!openaiKey || openaiKey === "your_openai_api_key_here") {
    return fallbackProblems[Math.floor(Math.random() * fallbackProblems.length)];
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional technical interviewer. Generate a unique and random DSA problem for a coding interview. Do NOT always pick Two Sum. Choose from various topics like Arrays, Strings, Linked Lists, Trees, or Dynamic Programming. Include 3-5 test cases, some of which should be hidden."
          },
          {
            role: "user",
            content: `Job Category: ${category}. Provide a random DSA problem in JSON format: { "question": "...", "problemStatement": "...", "constraints": "...", "inputFormat": "...", "outputFormat": "...", "sampleTestCases": "...", "testCases": [{ "input": "...", "expectedOutput": "...", "isHidden": boolean }] }`
          }
        ],
        response_format: { type: "json_object" }
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
      }
    );

    return JSON.parse(response.data.choices[0].message.content);
  } catch (error) {
    console.error("AI DSA Problem Generation Error:", error.response?.data || error.message);
    return fallbackProblems[Math.floor(Math.random() * fallbackProblems.length)];
  }
};

export const evaluateDSACode = async (problem, code, language) => {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey || openaiKey === "your_openai_api_key_here") {
    return { feedback: "Code looks functional. Consider optimizing time complexity.", score: 80 };
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional technical interviewer. Evaluate the candidate's code for a DSA problem."
          },
          {
            role: "user",
            content: `Problem: ${problem.question}\nStatement: ${problem.problemStatement}\nLanguage: ${language}\nCode: ${code}\n\nProvide feedback on correctness, complexity, and style, and a score (0-100) in JSON format: { "feedback": "...", "score": 85 }`
          }
        ],
        response_format: { type: "json_object" }
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
      }
    );

    return JSON.parse(response.data.choices[0].message.content);
  } catch (error) {
    console.error("AI DSA Evaluation Error:", error.response?.data || error.message);
    return { feedback: "Code looks functional. Consider optimizing time complexity.", score: 80 };
  }
};

export const chatWithAI = async (messages) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const systemPrompt = {
    role: "system",
    content: "You are the CareerConnect AI Assistant. Your goal is to help job seekers with their career-related questions, resume tips, interview preparation, and navigating the job portal. Be professional, encouraging, and concise."
  };

  if (geminiKey && geminiKey !== "your_gemini_api_key_here") {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const candidateModels = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash-8b",
        "gemini-1.5-flash",
      ];

      const normalizedMessages = (messages || [])
        .filter((message) => message?.content && ["user", "assistant"].includes(message.role))
        .slice(-20);

      const conversationText = normalizedMessages
        .map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`)
        .join("\n\n");

      const prompt = `${systemPrompt.content}\n\nConversation so far:\n${conversationText}\n\nReply as the assistant.`;

      let lastGeminiError = null;
      const geminiErrors = [];

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemPrompt.content,
          });

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text()?.trim();

          if (text) {
            return text;
          }
        } catch (modelError) {
          lastGeminiError = modelError;
          geminiErrors.push(modelError?.message || "");
          console.warn(`Gemini model ${modelName} failed:`, modelError.message);
        }
      }

      const allErrorsText = geminiErrors.join("\n").toLowerCase();
      const classifiedError = new Error("All Gemini model attempts failed");

      if (allErrorsText.includes("api key expired") || allErrorsText.includes("api_key_invalid") || allErrorsText.includes("invalid api key")) {
        classifiedError.kind = "key";
      } else if (allErrorsText.includes("quota") || allErrorsText.includes("rate limit") || allErrorsText.includes("429")) {
        classifiedError.kind = "quota";
      } else if (allErrorsText.includes("not found") || allErrorsText.includes("404")) {
        classifiedError.kind = "model";
      }

      classifiedError.details = allErrorsText;
      throw classifiedError || lastGeminiError || new Error("All Gemini model attempts failed");
    } catch (error) {
      const message = error?.message || "Gemini chat failed";
      console.error("Gemini Chat Error:", message);

      const details = `${message}\n${error?.details || ""}`.toLowerCase();
      const isKeyError = error?.kind === "key" || details.includes("api key expired") || details.includes("api_key_invalid") || details.includes("invalid api key");
      const isQuotaError = error?.kind === "quota" || details.includes("429") || details.includes("quota") || details.includes("rate limit");
      const isModelNotFound = error?.kind === "model" || details.includes("404") || details.includes("not found");

      const aiError = new Error(
        isKeyError
          ? "Gemini API key is invalid or expired. Generate a fresh key in Google AI Studio and update GEMINI_API_KEY."
          : isQuotaError
          ? "Gemini API quota is exceeded or unavailable for this key. Please enable billing/quota in Google AI Studio and try again."
          : isModelNotFound
          ? "Configured Gemini model is unavailable for this API key/version. Please update model access in Google AI Studio."
          : "Gemini API request failed. Please try again in a moment."
      );
      aiError.statusCode = isKeyError ? 401 : isQuotaError ? 429 : 503;
      throw aiError;
    }
  }

  if (!geminiKey || geminiKey === "your_gemini_api_key_here") {
    const aiError = new Error("Gemini API key is missing. Please set GEMINI_API_KEY in backend environment.");
    aiError.statusCode = 500;
    throw aiError;
  }

  if (!openaiKey || openaiKey === "your_openai_api_key_here") {
    const aiError = new Error("AI backend is not available right now. Please verify Gemini API configuration and quota.");
    aiError.statusCode = 503;
    throw aiError;
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [systemPrompt, ...messages],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI Chat Error:", error.response?.data || error.message);
    const aiError = new Error("AI provider request failed. Please try again later.");
    aiError.statusCode = 503;
    throw aiError;
  }
};

export const rankApplicantsWithAI = async (job, applications) => {
  const geminiKey = process.env.GEMINI_API_KEY;

  const heuristicRank = (apps) => {
    return apps
      .map((app) => {
        const profile = app.applicantID?.user || {};
        const skills = Array.isArray(profile.skills) ? profile.skills : [];
        const skillsText = skills.join(" ").toLowerCase();
        const jobText = [
          job?.title,
          job?.description,
          job?.qualifications,
          job?.responsibilities,
          job?.techStack,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const skillMatches = skills.filter((skill) => jobText.includes(String(skill).toLowerCase())).length;
        const expCount = Array.isArray(profile.experience) ? profile.experience.length : 0;
        const coverLetterScore = app.coverLetter ? Math.min(app.coverLetter.split(/\s+/).length / 40, 1) * 20 : 0;
        const score = Math.min(100, Math.round(skillMatches * 12 + expCount * 8 + coverLetterScore));

        return {
          applicationId: String(app._id),
          score,
          recommendation: score >= 75 ? "Shortlist" : score >= 50 ? "Consider" : "Reject",
          reason: score >= 75
            ? "Strong skills and relevant experience match."
            : score >= 50
            ? "Partial match; review for role-specific depth."
            : "Limited evidence of role fit from provided profile.",
        };
      })
      .sort((a, b) => b.score - a.score);
  };

  if (!geminiKey || geminiKey === "your_gemini_api_key_here") {
    return heuristicRank(applications);
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const candidateModels = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"];

    const normalizedCandidates = applications.map((app) => {
      const profile = app.applicantID?.user || {};
      const experience = Array.isArray(profile.experience)
        ? profile.experience.map((item) => `${item.role || ""} at ${item.company || ""} (${item.duration || ""})`).join("; ")
        : "";

      return {
        applicationId: String(app._id),
        name: app.name,
        email: app.email,
        coverLetter: app.coverLetter || "",
        skills: Array.isArray(profile.skills) ? profile.skills : [],
        bio: profile.bio || "",
        education: Array.isArray(profile.education) ? profile.education : [],
        experience,
      };
    });

    const prompt = `You are an expert technical recruiter.
Rank applicants for this job and provide concise decisions.

Job:
${JSON.stringify(
      {
        title: job?.title || "",
        description: job?.description || "",
        qualifications: job?.qualifications || "",
        responsibilities: job?.responsibilities || "",
        techStack: job?.techStack || "",
        category: job?.category || "",
        experienceLevel: job?.experienceLevel || "",
      },
      null,
      2
    )}

Applicants:
${JSON.stringify(normalizedCandidates, null, 2)}

Return ONLY valid JSON in this format:
{
  "rankings": [
    {
      "applicationId": "...",
      "score": 0,
      "recommendation": "Shortlist|Consider|Reject",
      "reason": "One short sentence"
    }
  ]
}`;

    let rawText = "";
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        rawText = response.text();
        if (rawText) break;
      } catch (error) {
        console.warn(`Gemini applicant ranking failed on ${modelName}:`, error.message);
      }
    }

    if (!rawText) {
      return heuristicRank(applications);
    }

    const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
    const rankings = Array.isArray(parsed?.rankings) ? parsed.rankings : [];

    if (!rankings.length) {
      return heuristicRank(applications);
    }

    return rankings
      .map((rank) => ({
        applicationId: String(rank.applicationId),
        score: Math.max(0, Math.min(100, Number(rank.score) || 0)),
        recommendation: ["Shortlist", "Consider", "Reject"].includes(rank.recommendation)
          ? rank.recommendation
          : "Consider",
        reason: rank.reason || "AI screening completed.",
      }))
      .sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error("AI applicant ranking error:", error.message);
    return heuristicRank(applications);
  }
};
