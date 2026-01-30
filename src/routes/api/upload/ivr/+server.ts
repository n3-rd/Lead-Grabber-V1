import { saveIvrAudio } from '$lib/utils/file-upload'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user?.company) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type')?.toString() || 'audio'
    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 })
    }
    const filename = `${type}-${Date.now()}-${Math.random().toString(36).substring(7)}`
    const url = await saveIvrAudio(file, filename)
    return json({ url })
  } catch (err: unknown) {
    console.error('IVR upload error:', err)
    return json(
      { error: err instanceof Error ? err.message : 'Failed to upload audio' },
      { status: 500 }
    )
  }
}
