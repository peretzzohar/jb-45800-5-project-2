const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const MODEL = 'meta/llama-3.1-8b-instruct'

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body)
      return
    }

    let raw = ''

    req.on('data', (chunk) => {
      raw += chunk
    })

    req.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })

    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = await readJsonBody(req)
    const messages = body?.messages

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid messages' })
    }

    const serverKey = process.env.NVIDIA_API_KEY || ''
    const fallbackClientKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : ''
    const key = serverKey.trim() || fallbackClientKey

    if (!key) {
      return res.status(400).json({ error: 'Missing NVIDIA_API_KEY' })
    }

    const upstream = await fetch(NVIDIA_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a data analysis assistant. Respond ONLY with valid JSON. No extra text.',
          },
          ...messages,
        ],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
        stream: false,
      }),
    })

    const upstreamData = await upstream.json().catch(() => null)

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: 'Upstream NVIDIA request failed',
        details: upstreamData,
      })
    }

    const content = upstreamData?.choices?.[0]?.message?.content

    if (typeof content !== 'string') {
      return res.status(502).json({ error: 'Invalid NVIDIA response format' })
    }

    return res.status(200).json({ content })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: 'AI recommendation request failed', message })
  }
}
