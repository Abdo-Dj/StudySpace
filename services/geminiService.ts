
import { GoogleGenAI } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getStudyAssistance = async (prompt: string, contextFiles: { name: string, content: string }[]) => {
  const ai = getAI();
  const contextStr = contextFiles.map(f => `File: ${f.name}\nContent Preview: ${f.content.substring(0, 500)}`).join('\n\n');
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      You are an elite academic study assistant. 
      The users are in a private collaborative study room.
      Here is the context of their current shared documents:
      ${contextStr}
      
      User Question: ${prompt}
    `,
    config: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40
    }
  });

  return response.text;
};

export const summarizeDocument = async (fileName: string, content: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Summarize this study document named "${fileName}":\n\n${content}`,
    config: {
      temperature: 0.3
    }
  });
  return response.text;
};
