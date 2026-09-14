import { createClient } from '@supabase/supabase-js';
import { validateBackup } from './model.js';

// Publishable key is intentionally public. Access is enforced by Postgres RLS.
export const supabase = createClient(
  'https://ynnbubbsbzzeymojimoi.supabase.co',
  'sb_publishable_XbOd9hpU2H87dRaOfvZSrg_R_K9O6bm',
  { auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);
export const EMPTY = { version: 1, leads: [] };
export async function readCloud(userId, client = supabase) {
  const { data, error } = await client.from('crm_documents')
    .select('document,revision').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data ? { document: validateBackup(data.document), revision: data.revision } : { document: EMPTY, revision: 0 };
}

// Compare-and-swap: a concurrent write is never silently overwritten.
// Reapply the user's operation to the latest server document after a conflict.
export async function changeCloud(userId, transform, client = supabase) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await readCloud(userId, client);
    const document = validateBackup(transform(structuredClone(current.document)));
    if (new TextEncoder().encode(JSON.stringify(document)).length > 4500000)
      throw Error('Evidence je příliš velká. Stáhni zálohu a rozděl ji.');
    const row = { user_id: userId, revision: current.revision + 1, document };
    const query = current.revision === 0
      ? client.from('crm_documents').insert(row)
      : client.from('crm_documents').update(row).eq('user_id', userId).eq('revision', current.revision);
    const { data, error } = await query.select('document,revision').maybeSingle();
    if (error && error.code !== '23505') throw error;
    if (data) return { document: validateBackup(data.document), revision: data.revision };
  }
  throw Error('Data mezitím změnilo jiné zařízení. Zkus uložení znovu.');
}
