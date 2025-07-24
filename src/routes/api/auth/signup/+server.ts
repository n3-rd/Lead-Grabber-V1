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

    // Create new user
    const newUser = await pb.collection('users').create({
      email,
      password,
      emailVisibility: true, // Set email visibility to true
    });

    console.log('New user created:', newUser);

    return json({ 
      success: true, 
      user: newUser 
    });
    
  } catch (error) {
    console.error('Error during signup:', error);
    return json({ 
      success: false, 
      error: 'Failed to sign up. Email may already exist.' 
    }, { status: 400 });
  }
}; 