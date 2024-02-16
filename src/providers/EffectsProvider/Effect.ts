import type { Vector2 } from '~/types'

import elf1 from '~/assets/splash/elf-1.png'
import elf2 from '~/assets/splash/elf-2.png'
import elf3 from '~/assets/splash/elf-3.png'
import elf4 from '~/assets/splash/elf-4.png'
import elf5 from '~/assets/splash/elf-5.png'
import elf6 from '~/assets/splash/elf-6.png'

export const elfImages = [elf1, elf2, elf3, elf4, elf5, elf6].map((src) => {
    const img = new Image()
    img.src = src
    return img
})

type CTXSettings = {
    globalAlpha?: number
    lineCap?: 'round'
    lineJoin?: 'round'
    lineWidth?: number
    strokeStyle?: string
    fillStyle?: string
    filter?: string
}

type DrawImageOptions = {
    image: CanvasImageSource
    position: Vector2
    rotation?: number
    size: Vector2
    scale?: number
    opacity?: number
}

export class Effect {
    canvas: HTMLCanvasElement
    ctx: CanvasRenderingContext2D

    ctxSettings: CTXSettings = {}
    shouldClear = false

    enabled: boolean

    constructor(canvas: HTMLCanvasElement, enabled = true) {
        this.canvas = canvas
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Failed to get context')
        this.ctx = ctx

        this.enabled = enabled
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(_: number) {
        if (!this.enabled) return
        if (this.shouldClear) this.clear()
    }

    drawImage({ image, position, rotation = 0, size, scale = 1, opacity = 1 }: DrawImageOptions) {
        this.ctx.save()
        Object.entries(this.ctxSettings).forEach(([key, value]) => {
            ;(this.ctx as any)[key] = value
        })
        this.ctx.globalAlpha = opacity
        this.ctx.translate(position.x, position.y)
        this.ctx.rotate(rotation)
        this.ctx.drawImage(image, (-scale * size.x) / 2, (-scale * size.y) / 2, scale * size.x, scale * size.y)
        this.ctx.restore()
    }

    updateCanvas(newCanvas: HTMLCanvasElement) {
        this.canvas = newCanvas
        const ctx = newCanvas.getContext('2d')
        if (!ctx) throw new Error('Failed to get context')
        this.ctx = ctx
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
}
