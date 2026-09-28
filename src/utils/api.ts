// Random per-browser id, so usage from different devices can be told apart
export function getClientId(): string {
  try {
    let id = localStorage.getItem('fc:clientId')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('fc:clientId', id)
    }
    return id
  } catch {
    return 'unknown'
  }
}

// Fire-and-forget: recording must never break the app
export function track(path: string, body: Record<string, unknown>) {
  fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: getClientId(), ...body }),
  }).catch(() => {})
}
