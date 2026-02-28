// Supabase Edge Function: invite-user
//
// Invites a user by email. Intended to replace Base44's `users.inviteUser`.
//
// Security model:
// - Caller must be authenticated.
// - Caller must have profiles.role = 'admin'.
// - Function uses SERVICE_ROLE key to perform admin invite.

import { serve } from 'https://deno.land/std@0.210.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') || '';

    // Client bound to the caller (for auth + role check)
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const callerId = userData.user.id;

    const { data: profile, error: profileErr } = await userClient
      .from('profiles')
      .select('role')
      .eq('user_id', callerId)
      .single();

    if (profileErr || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Missing email' }), { status: 400 });
    }

    // Admin client (bypasses RLS)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ ok: true, invited_user_id: data?.user?.id || null }), {
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
