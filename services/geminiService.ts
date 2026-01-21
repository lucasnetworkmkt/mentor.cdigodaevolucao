
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

// --- API KEY GROUPS CONFIGURATION ---
const DEFAULT_KEY = process.env.API_KEY || '';

const API_GROUPS = {
  A: [ // Text Chat
    process.env.API_KEY_A1 || DEFAULT_KEY,
    process.env.API_KEY_A2 || DEFAULT_KEY,
    process.env.API_KEY_A3 || DEFAULT_KEY
  ].filter(Boolean),
  B: [ // Voice
    process.env.API_KEY_B1 || DEFAULT_KEY,
    process.env.API_KEY_B2 || DEFAULT_KEY,
    process.env.API_KEY_B3 || DEFAULT_KEY
  ].filter(Boolean),
  C: [ // Mental Maps
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

  const uniqueKeys = Array.from(new Set(keys));

  for (const apiKey of uniqueKeys) {
    try {
      return await operation(apiKey);
    } catch (error: any) {
      console.warn(`API Key in Group ${group} failed. Trying next...`, error);
      lastError = error;
      
      const status = error?.status || error?.response?.status;
      // Retry on network errors (5xx) or rate limits (429)
      const isRetryable = !status || [429, 500, 503].includes(status);
      
      if (!isRetryable) {
         throw error;
      }
    }
  }

  throw new Error(`Todas as APIs do Grupo ${group} falharam. Verifique suas chaves. Erro: ${lastError?.message}`);
}

// --- PUBLIC SERVICES ---

export const getVoiceApiKey = async (): Promise<string> => {
  const keys = API_GROUPS.B;
  if (keys.length === 0) throw new Error("No API keys available for Voice (Group B)");
  return keys[0];
};

export const generateTextResponse = async (history: {role: string, parts: {text: string}[]}[], userMessage: string) => {
  return executeWithFallback('A', async (apiKey) => {
    const ai = new GoogleGenAI({ apiKey });
    
    // Ensure roles are correct for Gemini API (user/model)
    // Filter out potential empty messages or errors
    const validHistory = history.filter(h => h.parts && h.parts[0]?.text);

    const contents = [
      ...validHistory,
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    // Using gemini-3-flash-preview for speed and reliability.
    // Removed thinkingConfig as it causes 400 errors without explicit output token limits on some tiers.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 2048,
        temperature: 0.7, 
      }
    });

    if (!response.text) {
        throw new Error("O modelo retornou uma resposta vazia.");
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
      model: 'gemini-2.5-flash',
      contents: {
        parts: [{ text: prompt }]
      }
    });

    return response.text;
  });
};
