import type { Vector2 } from '~/types'
import { Effect, elfImages } from './Effect'

class ClickParticle {
    position: Vector2
    velocity: Vector2
    rotation: number
    rotVelocity: number
    size: number
    lifespan: number

    image: HTMLImageElement
    imageSize: Vector2

    createdAt: number

    constructor(position: Vector2, size: number, image: HTMLImageElement) {
        this.position = {
            x: position.x,
            y: position.y,
        }
        this.velocity = {
            x: window.devicePixelRatio * 150 * (1 - 2 * Math.random()),
            y: window.devicePixelRatio * -200 * Math.random(),
        }
        this.rotation = 2 * Math.PI * Math.random()
        this.rotVelocity = 10 * (1 - 2 * Math.random())
        this.lifespan = 3000 + 1000 * Math.random()

        this.image = image
        this.size = size
        this.imageSize = this.getSize(size)

        this.createdAt = Date.now()
    }

    isAlive() {
        return Date.now() - this.createdAt < this.lifespan
    }

    getLifeProgress(offset: number) {
        const adjustedOffset = this.lifespan - offset < 500 ? this.lifespan - 500 : offset
        return Math.max(0, (Date.now() - this.createdAt - adjustedOffset) / (this.lifespan - adjustedOffset))
    }

    update(delta: number, gravity = 200 * window.devicePixelRatio) {
        this.velocity.y += gravity * delta
        this.position.x += this.velocity.x * delta
        this.position.y += this.velocity.y * delta
        this.rotation += this.rotVelocity * delta
    }

    getSize(constraint: number): Vector2 {
        if (this.image.naturalWidth > this.image.naturalHeight) {
            return {
                x: constraint,
                y: (this.image.naturalHeight * constraint) / this.image.naturalWidth,
            }
        }
        return {
            x: (this.image.naturalWidth * constraint) / this.image.naturalHeight,
            y: constraint,
        }
    }
}

export class ElfettiEffect extends Effect {
    particles: ClickParticle[] = []
    images: HTMLImageElement[]

    constructor(canvas: HTMLCanvasElement, enabled = true) {
        super(canvas, enabled)

        this.images = elfImages
    }

    trigger(position: Vector2) {
        this.particles.unshift(
            ...Array.from({ length: 30 }, () => {
                return new ClickParticle(
                    position,
                    Math.floor((80 + 100 * Math.random()) * window.devicePixelRatio),
                    this.images[Math.floor(Math.random() * this.images.length)]
                )
            })
        )
        this.particles = this.particles.slice(0, 150)
    }

    update(delta: number) {
        if (!this.enabled) return
        super.update(delta)

        if (Math.random() < 0.02)
            this.trigger({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
            })
        for (let i = this.particles.length - 1; i > -1; i--) {
            const particle = this.particles[i]
            if (!particle.isAlive()) {
                this.particles.pop()
                continue
            }
            particle.update(delta)
            this.drawImage({
                image: particle.image,
                size: particle.imageSize,
                position: particle.position,
                rotation: particle.rotation,
                scale: 1 - particle.getLifeProgress(2500),
            })
        }
    }
}
