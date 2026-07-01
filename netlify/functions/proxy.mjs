import { Buffer } from 'node:buffer'

export const handler = async (event) => {
  const targetUrl = event.queryStringParameters?.url

  if (!targetUrl) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Missing url parameter' }),
    }
  }

  const decodedUrl = decodeURIComponent(targetUrl)

  try {
    const response = await fetch(decodedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    })

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': '*',
        'Cache-Control': 'no-cache',
      },
      body: base64,
      isBase64Encoded: true,
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    }
  }
}
