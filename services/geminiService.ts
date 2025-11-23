import { GoogleGenAI } from "@google/genai";

// Safe access to API Key for browser environments that might not polyfill process
const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : '';

const ai = new GoogleGenAI({ apiKey });

export const analyzeRootCause = async (
  assetName: string,
  symptoms: string,
  modelName: string
): Promise<string> => {
  try {
    if (!apiKey) {
        return "AI analysis unavailable (Missing API Key)";
    }

    const prompt = `
      Context: You are an expert maintenance engineer assistant for a CMMS system.
      Task: Analyze the symptoms reported for a medical device and suggest a likely root cause and potential solution.
      
      Asset: ${assetName} (Model: ${modelName})
      Reported Symptoms: ${symptoms}
      
      Please provide a concise, professional Root Cause Analysis (max 2 sentences) and a recommended action.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Unable to generate analysis.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI analysis currently unavailable.";
  }
};