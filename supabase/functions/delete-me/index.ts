// Supabase Edge Function: delete-me
//
// Deletes the currently authenticated user from Supabase Auth.
// Intended to replace Base44's `auth.deleteMe()`.
//
// Security model:
// - Caller must be authenticated.
// - Function deletes *only the caller*.
// - Uses SERVICE_ROLE key to delete auth user and perform cleanup.

import { serve } from 'https://deno.land/std@0.210.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') || '';

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const userId = userData.user.id;
    const email = userData.user.email?.toLowerCase() || null;

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Optional cleanup: delete players row by email
    if (email) {
      await adminClient.from('players').delete().eq('email', email);
    }

    // Delete auth user (profiles row is deleted via FK cascade)
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
