import { pb } from '$lib/pocketbase';
import { error } from '@sveltejs/kit';
import { PUBLIC_BASE_URL } from "$env/static/public";
import { buildLeadboxScript } from '$lib/embed/leadbox-builder';

export async function GET({ params, request, locals }) {
  try {
    pb.authStore.clear();

    let leadbox;
    let company;
    if (params.id === 'default') {
      // Get the most recently created leadbox
      const leadboxes = await pb.collection('leadboxes').getList(1, 1, {
        sort: '-created'
      });
      leadbox = leadboxes.items[0];
      company = await pb.collection('users').getOne(leadbox.owner);
    } else {
      leadbox = await pb.collection('leadboxes').getOne(params.id);
      company = await pb.collection('users').getOne(leadbox.owner);
    }

    if (!leadbox) {
      throw error(404, 'Leadbox not found');
    }

    const leadboxData = typeof leadbox.leadbox_data === 'string'
      ? JSON.parse(leadbox.leadbox_data)
      : leadbox.leadbox_data;

    const jsCode = buildLeadboxScript({
      id: params.id,
      leadboxData,
      companyId: company.company,
      baseUrl: PUBLIC_BASE_URL
    });

    return new Response(jsCode, {
      headers: {
        'Content-Type': 'application/javascript',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (err) {
    console.error('Error generating leadbox script:', err);
    return new Response('Error generating leadbox script', {
      status: err.status || 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
