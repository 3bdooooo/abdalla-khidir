
import { GoogleGenAI } from "@google/genai";
import { InventoryPart } from "../types";

let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiClient) {
    // Safely access env vars using optional chaining
    const apiKey = import.meta.env?.VITE_API_KEY || ''; 
    
    if (!apiKey) {
      console.warn("Google GenAI API Key is missing. AI features will not function.");
    }
    
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
    const apiKey = import.meta.env?.VITE_API_KEY || '';
    if (!apiKey) return "AI analysis unavailable (Missing API Key)";

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

export const searchKnowledgeBase = async (
  query: string,
  availableDocs: string[],
  language: 'en' | 'ar'
): Promise<{ explanation: string; solution: string; relevantDocs: string[] }> => {
  try {
    const ai = getAiClient();
    const apiKey = import.meta.env?.VITE_API_KEY || '';
    
    if (!apiKey) {
      return { 
        explanation: "AI Service Unavailable", 
        solution: "Please check API Key configuration.", 
        relevantDocs: [] 
      };
    }

    const langInstruction = language === 'ar' ? "Respond in Arabic." : "Respond in English.";

    const prompt = `
      Context: You are a Senior Biomedical Engineer assistant. 
      User Query: "${query}" (This could be an error code, a fault description, or a question).
      Available Service Manuals in Database: ${JSON.stringify(availableDocs.slice(0, 50))}

      Task:
      1. Analyze the query (Error Code or Fault).
      2. Explain the likely technical cause (e.g., Sensor failure, Board malfunction).
      3. Provide a step-by-step troubleshooting solution.
      4. Identify which 1-3 manuals from the provided list are most relevant to this issue.

      ${langInstruction}
      
      Output Format (JSON):
      {
        "explanation": "Brief technical explanation...",
        "solution": "1. Step one... 2. Step two...",
        "relevantDocs": ["Exact Title from list 1", "Exact Title from list 2"]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Search Error:", error);
    return {
      explanation: "Could not analyze query.",
      solution: "Please refer to the manufacturer manual manually.",
      relevantDocs: []
    };
  }
};

// NEW FUNCTION: Parts & Diagnosis Suggester
export const suggestDiagnosisAndParts = async (
    assetName: string,
    model: string,
    symptoms: string,
    inventoryList: InventoryPart[]
): Promise<{ rootCause: string; recommendedPart: string; probability: number }> => {
    try {
        const ai = getAiClient();
        const apiKey = import.meta.env?.VITE_API_KEY || '';
        if (!apiKey) return { rootCause: "API Key Missing", recommendedPart: "None", probability: 0 };

        // We pass a simplified inventory list to the AI so it can map to real parts
        const simpleInventory = inventoryList.map(p => ({ id: p.part_id, name: p.part_name }));

        const prompt = `
          Act as a Predictive Maintenance AI.
          Asset: ${assetName} (${model})
          Fault: "${symptoms}"
          Available Spare Parts: ${JSON.stringify(simpleInventory.slice(0, 30))}
          
          Task:
          1. Diagnose the Root Cause.
          2. Select the BEST matching part from the available list to fix this. If no exact match, suggest a generic part name.
          3. Estimate probability (0-100%) that this part fixes the issue.
          
          Output JSON: { "rootCause": "string", "recommendedPart": "string (Part Name)", "probability": number }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const text = response.text;
        if (!text) throw new Error("No response");

        return JSON.parse(text);

    } catch (e) {
        console.error("AI Parts Suggestion Failed", e);
        return { rootCause: "Analysis Failed", recommendedPart: "Manual Check Required", probability: 0 };
    }
};

// NEW FUNCTION: Image Generation
export const generateAssetThumbnail = async (deviceModel: string): Promise<string | null> => {
    try {
        const ai = getAiClient();
        const apiKey = import.meta.env?.VITE_API_KEY || '';
        if (!apiKey) throw new Error("API Key Missing");

        const prompt = `A hyper-realistic, high-resolution photograph of a ${deviceModel} in a clean, brightly lit, professional medical environment. The device should be the central focus, clearly visible with sharp details, and well-composed for a square or portrait crop. The background should be clean, slightly blurred, and non-distracting, ensuring the device stands out clearly. Lighting should be even and soft, showcasing the device's design and materials accurately, suitable for display as an icon or thumbnail within a mobile application. No text or overlays on the image itself. Clean edges, professional aesthetic.`;

        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                aspectRatio: '1:1',
                outputMimeType: 'image/jpeg'
            }
        });

        const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (imageBytes) {
            return `data:image/jpeg;base64,${imageBytes}`;
        }
        return null;

    } catch (e) {
        console.error("Image Generation Failed:", e);
        return null;
    }
};
