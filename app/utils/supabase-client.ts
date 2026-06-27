import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vwjkdzydwsxwejarggsp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3amtkenlkd3N4d2VqYXJnZ3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMTcwODcsImV4cCI6MjA5Nzc5MzA4N30.4UxE1e1l4f_Afbs5Aly4ajqrtiRbvoUi2NXv2G5uBqA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
