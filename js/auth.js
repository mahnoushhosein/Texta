// Single shared Supabase client — used by all pages
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function requireAuth() {
  const { data: { session } } = await sb.auth.getSession()
  if (!session) {
    window.location.href = 'login.html'
    return null
  }
  return session.user
}

async function requireGuest() {
  const { data: { session } } = await sb.auth.getSession()
  if (session) window.location.href = 'chat.html'
}

async function signOut() {
  await sb.auth.signOut()
  window.location.href = 'index.html'
}
