import type { PageServerLoad } from './$types'
import type { User } from '@backend/types';
interface ParentData {
  user?: User;
  // ... other properties that might be included
}

export const load: PageServerLoad = async (params): Promise<{ user: User | null }> => {
  const parentData = (await params.parent()) as unknown as ParentData;
  const { user = null } = parentData;
  return { user };
}
