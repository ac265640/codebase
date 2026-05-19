import { CohereClient } from 'cohere-ai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Cohere
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || '',
});

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export type Provider = 'cohere' | 'gemini';

export interface ChatResponse {
  answer: string;
  provider: Provider;
}

export async function generateChatResponse(prompt: string, fallback: boolean = true): Promise<ChatResponse> {
  try {
    // Primary: Cohere command-r
    const response = await cohere.chat({
      message: prompt,
      model: 'command-r-08-2024',
    });
    
    return {
      answer: response.text,
      provider: 'cohere',
    };
  } catch (err) {
    console.error('Cohere failed:', err);
    
    if (!fallback || !process.env.GEMINI_API_KEY) {
      throw err;
    }

    // Fallback: Gemini 1.5 Flash
    console.log('Falling back to Gemini...');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    
    return {
      answer: result.response.text(),
      provider: 'gemini',
    };
  }
}
