import type { PageServerLoad, Actions } from './$types'
import type { User, Dataset } from '@backend/types';
import dataManager from '$lib/services/data-manager';
interface ParentData {
  user?: User;
  // ... other properties that might be included
}

export const load: PageServerLoad = async (params): Promise<{ datasets: Dataset[] }> => {
  const parentData = (await params.parent()) as unknown as ParentData;
  if (!parentData || !parentData.user) {
    // Handle the case where user is not available
    console.error('No local DB user was found (probably because there\'s no supabase session)');
    return { datasets: [] }
  }

  const { user } = parentData;

  if (!user.watchedDatasets || !Array.isArray(user.watchedDatasets) || user.watchedDatasets.some(id => typeof id !== 'string')) {
    return { datasets: [] };
  }

  // @ts-ignore TODO: this type is incorrect: fix it via backend type generation
  const datasets = await dataManager.getDatasets(user.watchedDatasets);

  return { datasets: datasets ?? [] };
}

export const actions: Actions = {
  default: async (event) => {
    const { request, url, locals: { supabase } } = event
    const formData = await request.formData()
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    console.log('TODO handle username + password login here', email)
  }
}