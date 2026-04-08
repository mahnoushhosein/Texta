async function init() {
  const user = await requireAuth()
  if (!user) return

  const { data } = await sb.from('profiles').select('username, status').eq('id', user.id).single()
  if (data) {
    document.getElementById('username').value = data.username ?? ''
    document.getElementById('status').value   = data.status   ?? ''
  }

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn     = document.getElementById('save-btn')
    const msgEl   = document.getElementById('save-msg')
    btn.disabled  = true

    const { error } = await sb.from('profiles').update({
      username: document.getElementById('username').value.trim(),
      status:   document.getElementById('status').value.trim(),
      updated_at: new Date().toISOString()
    }).eq('id', user.id)

    msgEl.textContent  = error ? error.message : 'Profile saved!'
    msgEl.className    = error ? 'text-danger small' : 'text-success small'
    btn.disabled       = false
  })

  document.getElementById('signout-btn').addEventListener('click', signOut)
}

init()
