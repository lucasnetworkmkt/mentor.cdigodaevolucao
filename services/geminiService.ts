
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

// --- API KEY HELPER ---
// Tries to find the key in process.env (Vercel/Node) or import.meta.env (Vite client)
const getKey = (name: string): string => {
  // Check process.env (injected by vite define or node)
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name] as string;
  }
  // Check import.meta.env (Vite standard)
  try {
    // @ts-ignore
    if (import.meta.env && import.meta.env[name]) {
      // @ts-ignore
      return import.meta.env[name];
    }
    // Try with VITE_ prefix if not found
    // @ts-ignore
    if (import.meta.env && import.meta.env[`VITE_${name}`]) {
      // @ts-ignore
      return import.meta.env[`VITE_${name}`];
    }
  } catch (e) {}
  
  return '';
};

// --- API KEY GROUPS CONFIGURATION ---
const DEFAULT_KEY = getKey('API_KEY');

const API_GROUPS = {
  A: [ // Text Chat
    getKey('API_KEY_A1') || DEFAULT_KEY,
    getKey('API_KEY_A2') || DEFAULT_KEY,
    getKey('API_KEY_A3') || DEFAULT_KEY
  ].filter(k => k && k.length > 5), // Filter out short/empty strings
  B: [ // Voice
    getKey('API_KEY_B1') || DEFAULT_KEY,
    getKey('API_KEY_B2') || DEFAULT_KEY,
    getKey('API_KEY_B3') || DEFAULT_KEY
  ].filter(k => k && k.length > 5),
  C: [ // Mental Maps
    getKey('API_KEY_C1') || DEFAULT_KEY
  ].filter(k => k && k.length > 5)
};

// --- FALLBACK LOGIC ---
async function executeWithFallback<T>(
  group: 'A' | 'B' | 'C',
  operation: (apiKey: string) => Promise<T>
): Promise<T> {
  const keys = API_GROUPS[group];
  
  if (keys.length === 0) {
    throw new Error(`Nenhuma Chave de API válida encontrada. Verifique se a variável 'API_KEY' está configurada no Vercel.`);
  }

  let lastError: any;
  // Deduplicate keys
  const uniqueKeys = Array.from(new Set(keys));

  for (const apiKey of uniqueKeys) {
    try {
      return await operation(apiKey);
    } catch (error: any) {
      console.warn(`API Key in Group ${group} failed.`, error);
      lastError = error;
      
      const msg = error.message || '';
      const status = error.status || error.response?.status;
      
      // Critical errors that suggest the key is dead
      if (msg.includes('API key not valid') || status === 403) {
         console.error("Chave inválida ignorada.");
      }
      
      // If safety blocked it, no amount of retrying with the same config will help, 
      // but we iterate to next key just in case one has different permissions.
    }
  }

  // Generate a user-friendly error message
  let friendlyMessage = "Erro de conexão com o Mentor.";
  if (lastError?.message?.includes('API key')) {
    friendlyMessage = "Chave de API inválida.";
  } else if (lastError?.message?.includes('429')) {
    friendlyMessage = "Sobrecarga no sistema. Aguarde 30s.";
  } else if (lastError?.message?.includes('SAFETY') || lastError?.message?.includes('blocked')) {
     friendlyMessage = "O Mentor foi censurado pelos filtros de segurança.";
  }

  throw new Error(`${friendlyMessage} (${lastError?.message || 'Erro desconhecido'})`);
}

// --- PUBLIC SERVICES ---

export const getVoiceApiKey = async (): Promise<string> => {
  const keys = API_GROUPS.B;
  if (keys.length === 0) throw new Error("Chave de API de voz não configurada.");
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

    // Using gemini-2.5-flash for maximum stability and compatibility
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 2048,
        temperature: 0.8, // Increased slightly for more creative aggression
        // CRITICAL: Disable safety settings to allow "Commanding/Aggressive" persona
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      }
    });

    if (!response.text) {
        // Checking candidates to see if it was blocked
        if (response.candidates && response.candidates[0]?.finishReason) {
            throw new Error(`Bloqueio de Segurança (Motivo: ${response.candidates[0].finishReason})`);
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
      },
      config: {
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
      }
    });

    return response.text || "Erro ao gerar mapa.";
  });
};
