
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

// --- API KEY GROUPS CONFIGURATION ---
// In a real env, these would be process.env.API_KEY_A1, etc.
// Fallbacking to process.env.API_KEY for compatibility if specific keys aren't set.
const DEFAULT_KEY = process.env.API_KEY || '';

const API_GROUPS = {
  A: [ // Text Chat (Brain)
    process.env.API_KEY_A1 || DEFAULT_KEY,
    process.env.API_KEY_A2 || DEFAULT_KEY,
    process.env.API_KEY_A3 || DEFAULT_KEY
  ].filter(Boolean),
  B: [ // Voice (Realtime)
    process.env.API_KEY_B1 || DEFAULT_KEY,
    process.env.API_KEY_B2 || DEFAULT_KEY,
    process.env.API_KEY_B3 || DEFAULT_KEY
  ].filter(Boolean),
  C: [ // Mental Maps (Structured Text)
    process.env.API_KEY_C1 || DEFAULT_KEY
  ].filter(Boolean)
};

// --- FALLBACK LOGIC ---
async function executeWithFallback<T>(
  group: 'A' | 'B' | 'C',
  operation: (apiKey: string) => Promise<T>
): Promise<T> {
  const keys = API_GROUPS[group];
  let lastError: any;

  // Deduplicate keys to avoid retrying the same key if config maps to same env var
  const uniqueKeys = Array.from(new Set(keys));

  for (const apiKey of uniqueKeys) {
    try {
      return await operation(apiKey);
    } catch (error: any) {
      console.warn(`API Key in Group ${group} failed. Trying next...`, error);
      lastError = error;
      
      // Check for specific error types that warrant a retry
      // 429: Too Many Requests, 503: Service Unavailable, 500: Internal Error
      const status = error?.status || error?.response?.status;
      const isRetryable = !status || [429, 500, 503].includes(status);
      
      if (!isRetryable) {
         // If it's a client error (e.g., 400), do not retry with other keys
         throw error;
      }
    }
  }

  throw new Error(`Todas as APIs do Grupo ${group} falharam. Erro final: ${lastError?.message}`);
}

// --- PUBLIC SERVICES ---

export const getVoiceApiKey = async (): Promise<string> => {
  // Simple check to return a valid key for the Voice component to initialize its connection.
  // The Voice component implements its own reconnection logic, but needs a starting key.
  const keys = API_GROUPS.B;
  if (keys.length === 0) throw new Error("No API keys available for Voice (Group B)");
  return keys[0];
};

export const generateTextResponse = async (history: {role: string, parts: {text: string}[]}[], userMessage: string) => {
  return executeWithFallback('A', async (apiKey) => {
    const ai = new GoogleGenAI({ apiKey });
    
    const contents = [
      ...history,
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 2048 },
      }
    });

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
      - Estilo "Hacker/Terminal".
      
      Exemplo de formato esperado:
      
      OBJETIVO CENTRAL
      │
      ├── 01. FUNDAMENTOS
      │   ├── Ação Crítica A
      │   └── Ação Crítica B
      │
      ├── 02. ESTRATÉGIA
      │   ├── Passo Tático 1
      │   └── Passo Tático 2
      │
      └── 03. EXECUÇÃO
          └── O Grande Salto
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Fast and good for structured text
      contents: {
        parts: [{ text: prompt }]
      }
    });

    return response.text;
  });
};
