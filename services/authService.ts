import { UserProfile } from "../types";

// Keys for LocalStorage
const DB_USERS_KEY = "MENTOR_AUTH_USERS_DB";
const SESSION_KEY = "MENTOR_AUTH_SESSION_TOKEN";

// Helper to simulate async API delays
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

interface AuthResponse {
  user: UserProfile;
  token: string;
}

// NOTE: Since this is a client-side only deployment in this context (Vite), 
// we default to LocalStorage. If a real backend URL is provided via ENV, we use that.
const API_URL = process.env.VITE_API_URL || ''; 

export const authService = {
  /**
   * Registers a new user.
   */
  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    // If API URL is configured, try to hit the backend
    if (API_URL) {
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Falha no registro remoto.');
            }
            const data = await res.json();
            localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
            return data;
        } catch (e) {
            console.warn("Backend unavailable, falling back to local storage.", e);
        }
    }

    // Local Fallback
    await delay(800); 
    const usersStr = localStorage.getItem(DB_USERS_KEY);
    const users: any[] = usersStr ? JSON.parse(usersStr) : [];
    const normalizedEmail = email.toLowerCase().trim();

    if (users.find((u) => u.email === normalizedEmail)) {
      throw new Error("Este e-mail já está registrado no sistema (Local).");
    }

    const newUser = {
      id: generateId(),
      name: name.trim(),
      email: normalizedEmail,
      password: password, 
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));

    const userProfile: UserProfile = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      createdAt: newUser.createdAt,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(userProfile));
    return { user: userProfile, token: "mock-jwt-token" };
  },

  /**
   * Authenticates an existing user.
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    if (API_URL) {
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Credenciais inválidas.');
            }
            const data = await res.json();
            localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
            return data;
        } catch (e) {
            console.warn("Backend unavailable, falling back to local storage.", e);
        }
    }

    await delay(800);
    const usersStr = localStorage.getItem(DB_USERS_KEY);
    const users: any[] = usersStr ? JSON.parse(usersStr) : [];
    const normalizedEmail = email.toLowerCase().trim();
    
    // Strict comparison
    const user = users.find((u) => u.email === normalizedEmail && u.password === password);

    if (!user) {
      throw new Error("Credenciais inválidas. Verifique e-mail e senha.");
    }

    const userProfile: UserProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(userProfile));
    return { user: userProfile, token: "mock-jwt-token" };
  },

  /**
   * Checks for active session.
   */
  getCurrentUser: async (): Promise<UserProfile | null> => {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    if (!sessionStr) return null;

    try {
      return JSON.parse(sessionStr) as UserProfile;
    } catch (e) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  },

  /**
   * Logs out.
   */
  logout: async (): Promise<void> => {
    localStorage.removeItem(SESSION_KEY);
    await delay(200);
  },
};
