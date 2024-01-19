import { invalidate } from '$app/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

class SupabaseManager {
  public authStateHandler(supabase: SupabaseClient) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {

      if (!session || session?.expires_at !== session?.expires_at) {
        invalidate('supabase:auth');
        return;
      }

      console.log('onAuthStateChange', event);
      switch (event) {
        case 'SIGNED_OUT': {
          // delete cookies on sign out
          const expires = new Date(0).toUTCString();
          document.cookie = `my-access-token=; path=/; expires=${expires}; SameSite=Lax; secure`;
          document.cookie = `my-refresh-token=; path=/; expires=${expires}; SameSite=Lax; secure`;
          break;
        }
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED': {
          const maxAge = 30 * 3 * 24 * 60 * 60; // 3 months expiry
          document.cookie = `my-access-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; secure`;
          document.cookie = `my-refresh-token=${session.refresh_token}; path=/; max-age=${maxAge}; SameSite=Lax; secure`;
          if (!session) {
            supabase.auth.getSession().then(response => {
              console.log('refreshed session, redirecting', response.data.session);
              session = response.data.session;
              if (window.location.href !== '/') {
                window.location.href = '/';
              }
              return response;
            });
          }
          break;
        }
        default:
          // Handle any other events that are not covered above
          break;
      }
    });

    return subscription;
  }
}

export const supabaseManager = new SupabaseManager();