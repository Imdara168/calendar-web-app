function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')

  if (typeof atob === 'function') {
    return atob(padded)
  }

  return Buffer.from(padded, 'base64').toString('utf8')
}

export function getTokenExpiry(token: string): number | null {
  try {
    const [, payload] = token.split('.')

    if (!payload) {
      return null
    }

    const decoded = JSON.parse(decodeBase64Url(payload)) as { exp?: unknown }

    if (typeof decoded.exp !== 'number') {
      return null
    }

    return decoded.exp * 1000
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token)

  return expiry !== null && expiry <= Date.now()
}
