import { pb } from '$lib/pocketbase';
import { error } from '@sveltejs/kit';
import { PUBLIC_BASE_URL } from "$env/static/public";
import { buildLeadformScript } from '$lib/embed/leadform-builder';

export async function GET({ params, request, locals }) {
  try {
    pb.authStore.clear();

    let form;
    let company;
    if (params.id === 'default') {
      // Get the most recently created form
      const forms = await pb.collection('leadforms').getList(1, 1, {
        sort: '-created'
      });
      form = forms.items[0];
      company = await pb.collection('users').getOne(form.owner)
    } else {
      form = await pb.collection('leadforms').getOne(params.id);
      company = await pb.collection('users').getOne(form.owner)
    }

    if (!form) {
      throw error(404, 'Form not found');
    }

    const formData = typeof form.form_data === 'string'
      ? JSON.parse(form.form_data)
      : form.form_data;

    const jsCode = buildLeadformScript({
      id: params.id,
      formData,
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
    console.error('Error generating form script:', err);
    return new Response('Error generating form script', {
      status: err.status || 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
