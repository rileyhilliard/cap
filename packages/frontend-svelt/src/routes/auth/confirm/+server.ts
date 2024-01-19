import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

export const GET = async (event: RequestEvent) => {
  console.log('authentication req', event)
  const {
    url,
    locals: { supabase }
  } = event;
  const token_hash = url.searchParams.get('token_hash') as string;
  const type = url.searchParams.get('type') as string;
  const next = url.searchParams.get('next') ?? '/';

  if (token_hash && type) {
    console.log({ token_hash, type })
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    console.log('verifyOtp resolved')
    if (!error) {
      console.log('auth success ')
      throw redirect(303, `/${next.slice(1)}`);
    }
    console.log('error logging in ', error)
  }
  // return the user to an error page with some instructions
  throw redirect(303, '/login/error');
};