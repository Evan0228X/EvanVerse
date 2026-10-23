import { createClient } from '@supabase/supabase-js';


function resolveEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

let _client = null;

export function supabase() {
  if (_client) return _client;
  const { url, key } = resolveEnv();
  console.log('[EvanVerse] Supabase client init', { url, keyPrefix: key ? key.slice(0, 20) + '...' : '(none)' });
  _client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return _client;
}

export function hasSupabaseEnv() {
  const { url, key } = resolveEnv();
  return !!url && !!key;
}
