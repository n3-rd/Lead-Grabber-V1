import { pb } from '$lib/pocketbase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const email = data.email;
    const password = data.password;

    if (!email || !password) {
      return json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    // Authenticate user
    const authData = await pb.collection('users').authWithPassword(email, password);
    
    // Ensure email visibility is true
    await pb.collection("users").update(authData.record.id, {
      emailVisibility: true,
    });

    console.log('Authenticated user:', authData.record);

    return json({ 
      success: true, 
      user: authData.record,
      token: authData.token 
    });
    
  } catch (error) {
    console.error('Error during login:', error);
    return json({ 
      success: false, 
      error: 'Invalid email or password' 
    }, { status: 401 });
  }
}; 