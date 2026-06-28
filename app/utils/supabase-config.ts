// ═══════════════════════════════════════════════════════════════
//  SUPABASE-CONFIG.TS — Constantes partagées (client navigateur + Worker)
//  La clé "anon" est publique par conception (protégée par les RLS Postgres).
//  Centralisée ici pour éviter de dépendre des `vars` de wrangler.jsonc.
// ═══════════════════════════════════════════════════════════════

export const SUPABASE_URL = "https://vwjkdzydwsxwejarggsp.supabase.co";
export const SUPABASE_ANON_KEY =
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3amtkenlkd3N4d2VqYXJnZ3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMTcwODcsImV4cCI6MjA5Nzc5MzA4N30.4UxE1e1l4f_Afbs5Aly4ajqrtiRbvoUi2NXv2G5uBqA";
