function decodeBase64(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

export function dataUrlToBlob(fileUrl: string) {
  const [metadata, payload] = fileUrl.split(',', 2)

  if (!metadata || payload === undefined) {
    throw new Error('Invalid file data')
  }

  const mimeMatch = metadata.match(/^data:(.*?)(;base64)?$/)
  const mimeType = mimeMatch?.[1] || 'application/octet-stream'
  const isBase64 = metadata.includes(';base64')
  const bytes = isBase64 ? decodeBase64(payload) : new TextEncoder().encode(decodeURIComponent(payload))

  return new Blob([bytes], { type: mimeType })
}

export function openStoredFile(fileUrl: string) {
  const blob = fileUrl.startsWith('data:') ? dataUrlToBlob(fileUrl) : null
  const targetUrl = blob ? URL.createObjectURL(blob) : fileUrl
  const opened = window.open(targetUrl, '_blank')

  if (!opened) {
    if (blob) {
      URL.revokeObjectURL(targetUrl)
    }
    throw new Error('Unable to open the file')
  }

  if (blob) {
    setTimeout(() => URL.revokeObjectURL(targetUrl), 60_000)
  }
}

export function downloadStoredFile(fileUrl: string, fileName: string) {
  const blob = fileUrl.startsWith('data:') ? dataUrlToBlob(fileUrl) : null
  const targetUrl = blob ? URL.createObjectURL(blob) : fileUrl
  const link = document.createElement('a')

  link.href = targetUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()

  if (blob) {
    setTimeout(() => URL.revokeObjectURL(targetUrl), 60_000)
  }
}
