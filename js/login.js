requireGuest()

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const identifier = document.getElementById('identifier').value.trim()
  const password   = document.getElementById('password').value
  const errorEl    = document.getElementById('error')
  const btn        = document.getElementById('submit-btn')

  errorEl.textContent = ''
  btn.disabled = true
  btn.textContent = 'Logging in…'

  const email = identifier.includes('@') ? identifier : `${identifier.toLowerCase()}@texta.app`

  const { error } = await sb.auth.signInWithPassword({ email, password })

  if (error) {
    errorEl.textContent = error.message
    btn.disabled = false
    btn.textContent = 'Log in'
  } else {
    window.location.href = 'chat.html'
  }
})
