import type { User } from '@backend/types';
import type { Session } from '@supabase/supabase-js';
import dataManager from '$lib/services/data-manager';

export const load = async ({ locals: { getSession } }): Promise<{ user: User | null, session: Session | null }> => {
  const session = await getSession();
  const user = await dataManager.getUser(session);

  return {
    user,
    session
  }
}