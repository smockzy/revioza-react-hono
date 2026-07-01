import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Bucket public Storage (voir supabase/storage_wheel_images.sql)
export const WHEEL_IMAGES_BUCKET = 'wheel-images'

/**
 * Uploade une image dans le bucket public Supabase Storage et renvoie son URL
 * publique (visible par tous). Remplace l'ancien hébergement ImgBB + fallback
 * base64 local. Utilisé par /demo (anonyme) et /merchant (connecté).
 */
export async function uploadWheelImage(file: File): Promise<string> {
	const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
	const path = `${crypto.randomUUID()}.${ext}`

	const { error } = await supabase.storage
		.from(WHEEL_IMAGES_BUCKET)
		.upload(path, file, {
			cacheControl: '3600',
			upsert: false,
			contentType: file.type || 'image/jpeg',
		})

	if (error) throw error

	const { data } = supabase.storage.from(WHEEL_IMAGES_BUCKET).getPublicUrl(path)
	return data.publicUrl
}
