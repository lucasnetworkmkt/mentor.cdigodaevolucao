
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // CRITICAL FIX: Manually expose the API_KEY to the client-side code.
      // This allows 'API_KEY' from Vercel to work without the 'VITE_' prefix.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
      // Also expose VITE_API_KEY just in case the user renames it later
      'process.env.VITE_API_KEY': JSON.stringify(env.VITE_API_KEY || process.env.VITE_API_KEY),
      // Fallback for full env object
      'process.env': JSON.stringify(env)
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 1000,
    }
  };
});
