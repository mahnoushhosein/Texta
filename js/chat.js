let currentUser = null
let activeConversationId = null
let realtimeChannel = null
const profilesCache = {}

async function init() {
  currentUser = await requireAuth()
  if (!currentUser) return
  await loadConversations()
  setupNewChatModal()
}

// ── Conversations ────────────────────────────────────────────
async function loadConversations() {
  const { data } = await sb
    .from('conversation_members')
    .select(`
      conversation_id,
      conversations (
        id, created_at,
        conversation_members (
          user_id,
          profiles ( username )
        )
      )
    `)
    .eq('user_id', currentUser.id)
    .order('conversation_id', { ascending: false })

  const list = document.getElementById('conversation-list')
  list.innerHTML = ''

  if (!data || data.length === 0) {
    list.innerHTML = '<p class="text-center text-muted small mt-4">No messages yet.<br>Press + to start a chat.</p>'
    return
  }

  data.forEach(row => {
    const conv = row.conversations
    if (!conv) return
    const other = conv.conversation_members?.find(m => m.user_id !== currentUser.id)
    const displayName = other?.profiles?.username ?? 'Unknown'
    const initial = displayName[0]?.toUpperCase() ?? '?'

    const item = document.createElement('div')
    item.className = 'conv-item d-flex align-items-center gap-2 px-3 py-2'
    item.dataset.id = conv.id
    item.innerHTML = `
      <div class="avatar">${initial}</div>
      <span class="conv-name">${displayName}</span>
    `
    item.addEventListener('click', () => openConversation(conv.id, displayName))
    list.appendChild(item)
  })
}

// ── Messages ─────────────────────────────────────────────────
async function openConversation(convId, displayName) {
  activeConversationId = convId

  // Highlight active item
  document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'))
  document.querySelector(`.conv-item[data-id="${convId}"]`)?.classList.add('active')

  // Show chat panel, hide empty state
  document.getElementById('empty-state').classList.add('d-none')
  document.getElementById('chat-panel').classList.remove('d-none')
  document.getElementById('chat-title').textContent = displayName

  await loadMessages(convId)
  subscribeToMessages(convId)
}

async function loadMessages(convId) {
  const msgContainer = document.getElementById('messages')
  msgContainer.innerHTML = ''

  const { data } = await sb
    .from('messages')
    .select('*, profiles:sender_id (username)')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })

  if (!data) return

  data.forEach(msg => {
    if (msg.sender_id && msg.profiles?.username) {
      profilesCache[msg.sender_id] = msg.profiles.username
    }
    appendMessage(msg)
  })
  scrollToBottom()
}

function appendMessage(msg) {
  const isSelf = msg.sender_id === currentUser.id
  const username = profilesCache[msg.sender_id] ?? ''
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const wrapper = document.createElement('div')
  wrapper.className = `d-flex ${isSelf ? 'justify-content-end' : 'justify-content-start'} mb-1`

  wrapper.innerHTML = `
    <div class="msg-wrapper">
      ${!isSelf && username ? `<div class="sender-name">${username}</div>` : ''}
      <div class="bubble ${isSelf ? 'bubble-self' : 'bubble-other'}">
        ${escapeHtml(msg.content)}
        <span class="msg-time">${time}</span>
      </div>
    </div>
  `
  document.getElementById('messages').appendChild(wrapper)
}

function subscribeToMessages(convId) {
  if (realtimeChannel) sb.removeChannel(realtimeChannel)

  realtimeChannel = sb
    .channel(`messages:${convId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${convId}`
    }, async (payload) => {
      const msg = payload.new
      if (!profilesCache[msg.sender_id]) {
        const { data } = await sb.from('profiles').select('username').eq('id', msg.sender_id).single()
        if (data) profilesCache[msg.sender_id] = data.username
      }
      appendMessage(msg)
      scrollToBottom()
    })
    .subscribe()
}

// ── Send message ─────────────────────────────────────────────
document.getElementById('message-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const input = document.getElementById('message-input')
  const content = input.value.trim()
  if (!content || !activeConversationId) return
  input.value = ''
  await sb.from('messages').insert({
    conversation_id: activeConversationId,
    sender_id: currentUser.id,
    content
  })
})

document.getElementById('message-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    document.getElementById('message-form').requestSubmit()
  }
})

// ── New chat modal ────────────────────────────────────────────
function setupNewChatModal() {
  document.getElementById('start-dm-btn').addEventListener('click', async () => {
    const username = document.getElementById('dm-username').value.trim()
    const errorEl  = document.getElementById('dm-error')
    errorEl.textContent = ''

    if (!username) return (errorEl.textContent = 'Enter a username.')

    const { data: found } = await sb
      .from('profiles')
      .select('id, username')
      .ilike('username', username)
      .limit(1)

    if (!found || found.length === 0) return (errorEl.textContent = 'User not found.')
    const target = found[0]
    if (target.id === currentUser.id) return (errorEl.textContent = "You can't message yourself.")

    const convId = crypto.randomUUID()

    const { error } = await sb.from('conversations').insert({
      id: convId, name: target.username, is_group: false, created_by: currentUser.id
    })
    if (error) return (errorEl.textContent = error.message)

    await sb.from('conversation_members').insert([
      { conversation_id: convId, user_id: currentUser.id },
      { conversation_id: convId, user_id: target.id }
    ])

    bootstrap.Modal.getInstance(document.getElementById('newChatModal')).hide()
    document.getElementById('dm-username').value = ''
    await loadConversations()
    openConversation(convId, target.username)
  })
}

// ── Helpers ───────────────────────────────────────────────────
function scrollToBottom() {
  const el = document.getElementById('messages')
  el.scrollTop = el.scrollHeight
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

document.getElementById('signout-btn').addEventListener('click', signOut)

init()
