
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

// --- ROBUST KEY EXTRACTION ---
const getEnvVar = (key: string): string => {
  // 1. Try Vite's import.meta.env (Client Side standard)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    if (import.meta.env[key]) return import.meta.env[key];
    // @ts-ignore
    if (import.meta.env[`VITE_${key}`]) return import.meta.env[`VITE_${key}`];
  }

  // 2. Try process.env (Vercel/Node injection)
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[key]) return process.env[key] as string;
    if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`] as string;
  }

  return '';
};

// MASTER KEY (Fallback for everything)
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
    console.log(`[Mentor System] Usando chave MESTRA para o grupo ${prefix}`);
    keys.push(MAIN_KEY);
  }

  return keys;
};

const API_GROUPS = {
  A: getKeys('A', 3), // Text Chat
  B: getKeys('B', 3), // Voice
  C: getKeys('C', 1)  // Maps
};

// Debug Log (Safe - shows only last 4 chars)
console.log("[Mentor System] Diagnóstico de Chaves:");
Object.entries(API_GROUPS).forEach(([group, keys]) => {
  console.log(`Grupo ${group}: ${keys.length > 0 ? 'ONLINE' : 'OFFLINE'} (${keys.length} chaves disponíveis)`);
});

// --- FALLBACK LOGIC ---
async function executeWithFallback<T>(
  group: 'A' | 'B' | 'C',
  operation: (apiKey: string) => Promise<T>
): Promise<T> {
  const keys = API_GROUPS[group];
  
  if (keys.length === 0) {
    throw new Error(`ERRO CRÍTICO: Nenhuma Chave de API encontrada para o Grupo ${group}. Configure a variável 'API_KEY' no Vercel.`);
  }

  let lastError: any;
  const uniqueKeys = Array.from(new Set(keys));

  for (const apiKey of uniqueKeys) {
    try {
      return await operation(apiKey);
    } catch (error: any) {
      console.warn(`Tentativa falhou no Grupo ${group}. Erro:`, error.message);
      lastError = error;
      
      const status = error.status || error.response?.status;
      // Don't retry if the key is explicitly invalid (403/400)
      if (status === 403 || error.message?.includes('API key not valid')) {
         console.error("Chave inválida detectada e ignorada.");
      }
    }
  }

  // Final Error Message
  let msg = "Erro de conexão com o Mentor.";
  if (lastError?.message?.includes('API key')) msg = "Chave de API inválida.";
  if (lastError?.message?.includes('SAFETY')) msg = "Bloqueio de Segurança do Modelo.";
  
  throw new Error(`${msg} Detalhes: ${lastError?.message || 'Desconhecido'}`);
}

// --- PUBLIC SERVICES ---

export const getVoiceApiKey = async (): Promise<string> => {
  const keys = API_GROUPS.B;
  if (keys.length === 0) {
     // Last resort fallback
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
        temperature: 0.8,
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
      REGRAS: ASCII style (├──), Sem markdown block, Hierárquico, Focado em Ação.
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
