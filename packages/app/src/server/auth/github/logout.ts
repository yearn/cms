import { isCrossSiteRequest, sessionCookies } from './session'

export default async function (req: Request): Promise<Response> {
  if (isCrossSiteRequest(req)) return new Response('Forbidden', { status: 403 })
  const headers = new Headers()
  for (const cookie of sessionCookies(req, '', '')) headers.append('Set-Cookie', cookie)
  return new Response(null, { status: 204, headers })
}
