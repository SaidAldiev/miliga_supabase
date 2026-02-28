import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client + small compatibility wrapper.
 *
 * This app originally used Base44's SDK shape:
 *   api.auth.me(), api.auth.updateMe(), api.entities.<Table>.<crud>()
 *
 * To keep the rest of the code changes small, we expose a similar API surface
 * backed by Supabase Auth + Postgres.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Create a .env.local from .env.example.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const throwIfError = (res) => {
  if (res?.error) throw res.error;
  return res?.data;
};

const applyOrder = (query, order) => {
  if (!order) return query;
  // Base44 convention: '-created_date' means DESC.
  const desc = typeof order === 'string' && order.startsWith('-');
  const column = desc ? order.slice(1) : order;
  return query.order(column, { ascending: !desc });
};

const applyFilterObject = (query, filterObj) => {
  if (!filterObj) return query;
  let q = query;
  Object.entries(filterObj).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null) {
      q = q.is(key, null);
      return;
    }
    if (Array.isArray(value)) {
      q = q.in(key, value);
      return;
    }
    q = q.eq(key, value);
  });
  return q;
};

const makeEntity = (tableName) => ({
  /** List rows with optional order + optional limit. */
  async list(order, limit) {
    let q = supabase.from(tableName).select('*');
    q = applyOrder(q, order);
    if (typeof limit === 'number') q = q.limit(limit);
    return throwIfError(await q);
  },

  /** Filter rows by an object of equality filters (and optional order + limit). */
  async filter(filters, order, limit) {
    let q = supabase.from(tableName).select('*');
    q = applyFilterObject(q, filters);
    q = applyOrder(q, order);
    if (typeof limit === 'number') q = q.limit(limit);
    return throwIfError(await q);
  },

  /** Get a single row by id. */
  async get(id) {
    return throwIfError(await supabase.from(tableName).select('*').eq('id', id).single());
  },

  /** Insert and return inserted row. */
  async create(payload) {
    return throwIfError(await supabase.from(tableName).insert(payload).select('*').single());
  },

  /** Update and return updated row. */
  async update(id, patch) {
    return throwIfError(
      await supabase.from(tableName).update(patch).eq('id', id).select('*').single()
    );
  },

  /** Delete a row by id. */
  async delete(id) {
    return throwIfError(await supabase.from(tableName).delete().eq('id', id));
  },
});

export const api = {
  supabase,

  auth: {
    /**
     * Returns an application-level user object: auth user + profile fields.
     * We store app-specific fields (nickname, activeGroupId, role) in `profiles`.
     */
    async me() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session?.user) throw new Error('Not authenticated');

      const authUser = session.user;

      // Fetch profile (created automatically by DB trigger; see supabase/schema.sql)
      const profile = await throwIfError(
        await supabase
          .from('profiles')
          .select('user_id,email,nickname,role,active_group_id,avatar_url,full_name')
          .eq('user_id', authUser.id)
          .maybeSingle()
      );

      return {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name ?? authUser.user_metadata?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? authUser.user_metadata?.avatar_url ?? null,
        nickname: profile?.nickname ?? null,
        role: profile?.role ?? 'user',
        activeGroupId: profile?.active_group_id ?? null,
      };
    },

    /** Update app-level profile fields for the current user. */
    async updateMe(patch) {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) throw new Error('Not authenticated');

      const updates = {};
      if (patch?.nickname !== undefined) updates.nickname = patch.nickname;
      if (patch?.activeGroupId !== undefined) updates.active_group_id = patch.activeGroupId;
      if (patch?.full_name !== undefined) updates.full_name = patch.full_name;
      if (patch?.avatar_url !== undefined) updates.avatar_url = patch.avatar_url;
      if (patch?.role !== undefined) updates.role = patch.role; // admins only (RLS should enforce)

      if (Object.keys(updates).length === 0) return await this.me();

      await throwIfError(
        await supabase
          .from('profiles')
          .update({ ...updates, updated_date: new Date().toISOString() })
          .eq('user_id', user.id)
      );

      return await this.me();
    },

    /** Sign out and optionally redirect. */
    async logout(redirectUrl) {
      await supabase.auth.signOut();
      if (redirectUrl) window.location.href = redirectUrl;
    },

    /** Redirect users to the local login screen (not a third-party hosted flow). */
    redirectToLogin(fromUrl) {
      const url = new URL(window.location.href);
      url.pathname = '/login';
      if (fromUrl) url.searchParams.set('redirect', fromUrl);
      window.location.href = url.toString();
    },

    /** Delete current user via Edge Function (requires service role server-side). */
    async deleteMe() {
      const res = await supabase.functions.invoke('delete-me', { body: {} });
      throwIfError(res);
      // Session is invalid after deletion.
      await supabase.auth.signOut();
      return true;
    },
  },

  users: {
    /**
     * Invite a user by email via Edge Function. Requires caller to be admin.
     * Role is optional; you can store it in `profiles.role`.
     */
    async inviteUser(email, role = 'user') {
      const res = await supabase.functions.invoke('invite-user', {
        body: { email, role },
      });
      return throwIfError(res);
    },
  },

  appLogs: {
    /** Client-side activity logging (writes to app_logs table). */
    async logUserInApp(page_name) {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) return;
      await throwIfError(
        await supabase.from('app_logs').insert({ user_id: user.id, page_name })
      );
    },
  },

  entities: {
    Group: makeEntity('groups'),
    Player: makeEntity('players'),
    Match: makeEntity('matches'),
    Event: makeEntity('events'),
  },
};
