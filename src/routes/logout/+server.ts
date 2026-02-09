import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, cookies }) => {
	cookies.delete('app_session', { path: '/' })
	const redirectTo = url.searchParams.get('redirect') || '/login'
	throw redirect(303, redirectTo)
}

export const POST: RequestHandler = async ({ url, cookies }) => {
	cookies.delete('app_session', { path: '/' })
	const redirectTo = url.searchParams.get('redirect') || '/login'
	throw redirect(303, redirectTo)
}
