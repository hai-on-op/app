import { get } from '@vercel/edge-config'

export const edge = true

export default async function handler() {
    const greeting = await get('greeting')

    console.log('greeting is', greeting)

    return new Response('Edge Function: OK', {
        status: 200,
    })
}
