requireGuest()

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const username = document.getElementById('username').value.trim()
  const password = document.getElementById('password').value
  const confirm  = document.getElementById('confirm').value
  const errorEl  = document.getElementById('error')
  const btn      = document.getElementById('submit-btn')

  errorEl.textContent = ''

  if (/\s/.test(username))        return (errorEl.textContent = 'Username cannot contain spaces.')
  if (password !== confirm)        return (errorEl.textContent = 'Passwords do not match.')
  if (password.length < 6)         return (errorEl.textContent = 'Password must be at least 6 characters.')

  btn.disabled = true
  btn.textContent = 'Creating account…'

  const email = `${username.toLowerCase()}@texta.app`

  const { error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { username } }
  })

  if (error) {
    errorEl.textContent = error.message
    btn.disabled = false
    btn.textContent = 'Sign up'
  } else {
    window.location.href = 'chat.html'
  }
})
