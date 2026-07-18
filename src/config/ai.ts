import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export let googleGenAI: GoogleGenerativeAI | null = null;
export let langchainGemini: ChatGoogleGenerativeAI | null = null;

if (GEMINI_API_KEY) {
  try {
    // 1. Google Gemini SDK Setup
    googleGenAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    console.log('Google Gemini SDK configured successfully.');

    // 2. LangChain Gemini Setup
    langchainGemini = new ChatGoogleGenerativeAI({
      apiKey: GEMINI_API_KEY,
      modelName: 'gemini-3.5-flash',
      temperature: 0.2,
    });
    console.log('LangChain ChatGoogleGenerativeAI configured successfully.');
  } catch (error) {
    console.error('Error initializing AI configs:', error);
  }
} else {
  console.warn('GEMINI_API_KEY not found. AI models will remain uninitialized.');
}
