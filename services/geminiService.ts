import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiClient) {
    // Robust check for process.env to prevent "process is not defined" errors in browser
    const apiKey = typeof process !== 'undefined' && process.env && process.env.API_KEY 
      ? process.env.API_KEY 
      : ''; 
    
    // Initialize even with empty key to allow app to load, requests will fail gracefully later
    aiClient = new GoogleGenAI({ apiKey: apiKey || 'dummy_key' });
  }
  return aiClient;
};

export const analyzeRootCause = async (
  assetName: string,
  symptoms: string,
  modelName: string
): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // Double check key existence before call to avoid 400s if possible, though SDK handles it
    const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : '';
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