import { get } from '@vercel/edge-config'

export const edge = true

export default async function handler() {
    const animal = await get('ANIMAL')

    console.log('Animal is', animal)

    return new Response('Edge Function: OK', {
        status: 200,
    })
}
