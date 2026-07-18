"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.langchainGemini = exports.googleGenAI = void 0;
const generative_ai_1 = require("@google/generative-ai");
const google_genai_1 = require("@langchain/google-genai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
exports.googleGenAI = null;
exports.langchainGemini = null;
if (GEMINI_API_KEY) {
    try {
        // 1. Google Gemini SDK Setup
        exports.googleGenAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY);
        console.log('Google Gemini SDK configured successfully.');
        // 2. LangChain Gemini Setup
        exports.langchainGemini = new google_genai_1.ChatGoogleGenerativeAI({
            apiKey: GEMINI_API_KEY,
            modelName: 'gemini-1.5-flash',
            temperature: 0.2,
        });
        console.log('LangChain ChatGoogleGenerativeAI configured successfully.');
    }
    catch (error) {
        console.error('Error initializing AI configs:', error);
    }
}
else {
    console.warn('GEMINI_API_KEY not found. AI models will remain uninitialized.');
}
