import { createInstance } from '$lib/pocketbase'
import type { Handle } from '@sveltejs/kit'
import { redirect } from '@sveltejs/kit'

// Cache for auth refresh timestamps to avoid refreshing too frequently
const authRefreshCache = new Map<string, number>();
const AUTH_REFRESH_CACHE_MS = 60000; // Cache auth refresh for 60 seconds

export const handle: Handle = async ({ event, resolve }) => {
  const publicRoutes = [
    '/login',
    '/signup',
    '/api',
    '/embed',
    '/embed/leadform/[id]',
    '/invite/accept/[id]',
    '/embed/leadbox/[id]',
    '/api/twilio/webhook',
    '/api/twilio/webhook/sms'
  ];
  
  // Skip auth refresh for API routes (they're stateless)
  const isApiRoute = event.url.pathname.startsWith('/api/');
  const isPublicRoute = publicRoutes.some(route => {
    if (route.includes('[')) {
      // Handle dynamic routes
      const pattern = route.replace(/\[.*?\]/g, '[^/]+');
      return new RegExp(`^${pattern}$`).test(event.url.pathname);
    }
    return event.url.pathname.startsWith(route);
  });
  
  const rolePermissions = {
    owner: ['manage_team', 'manage_settings', 'manage_billing', 'view_analytics'],
    admin: ['manage_team', 'manage_settings', 'view_analytics'],
    member: ['view_analytics']
  };
  
  const pb = createInstance()

  // load the store data from the request cookie string
  pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '')
  
  // Only refresh auth for non-API, non-public routes and cache it to avoid too frequent refreshes
  if (!isApiRoute && !isPublicRoute && pb.authStore.isValid && pb.authStore.record) {
    const userId = pb.authStore.record.id;
    const lastRefresh = authRefreshCache.get(userId) || 0;
    const now = Date.now();
    
    try {
      // Only refresh if cache expired (60 seconds)
      if (now - lastRefresh > AUTH_REFRESH_CACHE_MS) {
        await pb.collection('users').authRefresh();
        authRefreshCache.set(userId, now);
        
        // Clean up old cache entries periodically (keep only last 1000)
        if (authRefreshCache.size > 1000) {
          const entries = Array.from(authRefreshCache.entries());
          const toKeep = entries.slice(-500); // Keep most recent 500
          authRefreshCache.clear();
          toKeep.forEach(([key, value]) => authRefreshCache.set(key, value));
        }
      }
    } catch (error: any) {
      // Handle rate limit errors gracefully
      if (error?.status === 429 || error?.response?.code === 429) {
        // On rate limit, don't clear auth - just skip refresh
        console.warn('Rate limited on auth refresh, skipping');
      } else {
        // Clear auth store on other errors
        pb.authStore.clear();
        authRefreshCache.delete(userId);
      }
    }
  }

  event.locals.pb = pb
  event.locals.user = pb.authStore.record

  const response = await resolve(event)

  // send back the default 'pb_auth' cookie to the client with the latest store state
  response.headers.set(
    'set-cookie',
    pb.authStore.exportToCookie({ httpOnly: false }),
  )

  return response
}