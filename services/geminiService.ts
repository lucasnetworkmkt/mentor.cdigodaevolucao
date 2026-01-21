
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

// --- AGGRESSIVE KEY EXTRACTION ---
const getEnvVar = (key: string): string => {
  let value = '';

  // 1. Direct process.env check (injected by vite.config.ts define)
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[key]) value = process.env[key] as string;
    else if (process.env[`VITE_${key}`]) value = process.env[`VITE_${key}`] as string;
  }

  // 2. Import.meta.env check (Vite standard)
  if (!value && typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const env = (import.meta as any).env;
    if (env[key]) value = env[key];
    else if (env[`VITE_${key}`]) value = env[`VITE_${key}`];
  }

  return value || '';
};

// MASTER KEY (Fallback for everything)
// We specifically look for 'API_KEY' which we forced in vite.config.ts
const MAIN_KEY = getEnvVar('API_KEY');

// Helper to get a list of keys or fallback to main
const getKeys = (prefix: string, count: number): string[] => {
  const keys: string[] = [];
  
  // Try specific keys first (e.g., API_KEY_A1)
  for (let i = 1; i <= count; i++) {
    const k = getEnvVar(`API_KEY_${prefix}${i}`);
    if (k && k.length > 10) keys.push(k);
  }

  // If no specific keys found, use the Main Key
  if (keys.length === 0 && MAIN_KEY && MAIN_KEY.length > 10) {
    keys.push(MAIN_KEY);
  }

  return keys;
};

const API_GROUPS = {
  A: getKeys('A', 3), // Text Chat
  B: getKeys('B', 3), // Voice
  C: getKeys('C', 1)  // Maps
};

// --- FALLBACK LOGIC ---
async function executeWithFallback<T>(
  group: 'A' | 'B' | 'C',
  operation: (apiKey: string) => Promise<T>
): Promise<T> {
  const keys = API_GROUPS[group];
  
  if (keys.length === 0) {
    // Detailed error for debugging
    console.error(`[Mentor Error] Missing Keys. Tried: API_KEY, VITE_API_KEY. Found: ${MAIN_KEY ? 'Yes' : 'No'}`);
    throw new Error(`ERRO DE CONFIGURAÇÃO: Chave API não detectada. Se você configurou 'API_KEY' no Vercel, aguarde o redeploy.`);
  }

  let lastError: any;
  const uniqueKeys = Array.from(new Set(keys));

  for (const apiKey of uniqueKeys) {
    try {
      return await operation(apiKey);
    } catch (error: any) {
      console.warn(`Tentativa falhou no Grupo ${group}.`, error.message);
      lastError = error;
      
      const status = error.status || error.response?.status;
      if (status === 403 || error.message?.includes('API key not valid')) {
         console.error("Chave inválida ignorada.");
      }
    }
  }

  // Final Error Message
  let msg = "Erro de conexão com o Mentor.";
  if (lastError?.message?.includes('API key')) msg = "Chave de API inválida.";
  if (lastError?.message?.includes('SAFETY')) msg = "Bloqueio de Segurança do Modelo.";
  
  throw new Error(`${msg} (${lastError?.message || 'Erro desconhecido'})`);
}

// --- PUBLIC SERVICES ---

export const getVoiceApiKey = async (): Promise<string> => {
  const keys = API_GROUPS.B;
  if (keys.length === 0) {
     if (MAIN_KEY) return MAIN_KEY;
     throw new Error("Sistema de Voz sem chave de acesso.");
  }
  return keys[0];
};

export const generateTextResponse = async (history: {role: string, parts: {text: string}[]}[], userMessage: string) => {
  return executeWithFallback('A', async (apiKey) => {
    const ai = new GoogleGenAI({ apiKey });
    
    const validHistory = history.filter(h => h.parts && h.parts[0]?.text);

    const contents = [
      ...validHistory,
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 2048,
        temperature: 0.9, // Higher temp for more personality
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      }
    });

    if (!response.text) {
        if (response.candidates && response.candidates[0]?.finishReason) {
            throw new Error(`Bloqueio de Segurança: ${response.candidates[0].finishReason}`);
        }
        throw new Error("Resposta vazia do modelo.");
    }

    return response.text;
  });
};

export const generateMentalMapStructure = async (topic: string) => {
  return executeWithFallback('C', async (apiKey) => {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Crie um MAPA MENTAL ESTRUTURADO em formato de ÁRVORE DE TEXTO (ASCII/Tree Style) sobre: "${topic}".
      REGRAS VISUAIS:
      - Use caracteres ASCII para conectar: ├──, └──, │.
      - Não use Markdown code blocks (\`\`\`), apenas o texto puro.
      - Seja hierárquico, direto e focado em EXECUÇÃO.
      - Limite a 3 níveis de profundidade.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] },
      config: {
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      }
    });

    return response.text || "Erro ao gerar mapa.";
  });
};
