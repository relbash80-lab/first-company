import { createClient, SupabaseAuthAdapter } from '@neondatabase/neon-js';
import { createAuthClient } from '@neondatabase/neon-js/auth';

const neonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL;
const neonDataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL;

if (!neonAuthUrl || !neonDataApiUrl) {
  throw new Error('Neon environment variables are missing. Copy .env.example to .env.local.');
}

// Keep the existing export name while the service layer migrates. The value is
// now Neon's official Auth + Data API client with a Supabase-compatible API.
export const supabase = createClient({
  auth: {
    url: neonAuthUrl,
    adapter: SupabaseAuthAdapter(),
  },
  dataApi: {
    url: neonDataApiUrl,
  },
});

// The compatibility adapter intentionally omits password-token completion.
// Use the native Neon Auth client for that one Better Auth operation.
export const neonAuth = createAuthClient(neonAuthUrl);
