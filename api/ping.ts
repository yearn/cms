export const config = {
  runtime: 'edge'
}

export default async function (req: Request): Promise<Response> {
  if (req.method !== 'GET')
    return new Response('Method Not Allowed', { status: 405 })

  return new Response(JSON.stringify({ now: new Date().toISOString() }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  })
}
