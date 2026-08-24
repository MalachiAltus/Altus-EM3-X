import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { setOffline } from '@/lib/network/status';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Check your .env file.'
  );
}

// A thrown fetch (as opposed to a resolved response, even an error one like
// 401/403) means the request never reached the server — no connectivity.
// That's the one signal worth surfacing app-wide as "you're offline", so a
// dead network shows a clean banner instead of screens stuck loading forever.
function trackedFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, init)
    .then((res) => {
      setOffline(false);
      return res;
    })
    .catch((err) => {
      setOffline(true);
      throw err;
    });
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: trackedFetch,
  },
});
