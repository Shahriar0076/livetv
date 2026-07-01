import { getStore } from '@netlify/blobs'

export default async () => {
  try {
    const store = getStore('channel-status-store')
    const data = await store.getJSON('latest')

    if (!data || !data.statuses || !data.checkedAt) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'No channel status data available yet' }),
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
      },
      body: JSON.stringify(data),
    }
  } catch (err) {
    console.error('Failed to read channel status:', err)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Failed to fetch channel status' }),
    }
  }
}
