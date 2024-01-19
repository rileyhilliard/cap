import type { Dataset, } from '@backend/types';
import dataManager from '$lib/services/data-manager';
import { redirect } from '@sveltejs/kit';

export async function load({ params: { dataset: slug } }): Promise<{ dataset: Dataset } | { status: number; redirect: string }> {
  try {
    // const result = await client.query(QUERY, { slug }).toPromise();
    const dataset = await dataManager.getDataset(slug);

    if (!dataset) {
      // TODO: look up how to properly redirect in svelte kit
      return { status: 404, redirect: '/404' };
    }

    return {
      dataset,
    };
  } catch (error) {
    console.error("Error fetching dataset:", error);
    // TODO: if there's an error, it's probably not a 404, so fallback to an error page
    throw redirect(303, '/404');
  }
}
