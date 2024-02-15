import { Dispatch, createContext, useContext, useEffect, useReducer, useRef, useState } from 'react'

import type { ReactChildren, SetState } from '~/types'
import { Effect } from './Effect'

import styled from 'styled-components'
import { ElfettiEffect } from './Elfetti'

type EffectState = {
    id: string
    effect: Effect
}
type EffectUpdate =
    | {
          action: 'disable' | 'enable'
          id?: string
      }
    | {
          action: 'add'
          effect: Effect | Effect[]
      }

type EffectReducer = (state: EffectState[], update: EffectUpdate) => EffectState[]

type EffectsContext = {
    canvas: HTMLCanvasElement | null
    effects: EffectState[]
    updateEffects: Dispatch<EffectUpdate>
    screensaverActive: boolean
    toggleScreensaver: SetState<boolean>
}

const defaultState: EffectsContext = {
    canvas: null,
    effects: [],
    updateEffects: (state) => state,
    screensaverActive: false,
    toggleScreensaver: () => undefined,
}

const EffectsContext = createContext<EffectsContext>(defaultState)

export const useEffects = () => useContext(EffectsContext)

type Props = {
    children: ReactChildren
}
export function EffectsProvider({ children }: Props) {
    const [screensaverActive, toggleScreensaver] = useState(false)
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)

    const [effects, updateEffects] = useReducer<EffectReducer>((state, update) => {
        switch (update.action) {
            case 'add': {
                const toAdd = Array.isArray(update.effect) ? update.effect : [update.effect]
                return [
                    ...state,
                    ...toAdd.map((effect, i) => ({
                        id: (Object.keys(state).length + i + 1).toString(),
                        effect,
                    })),
                ]
            }
            case 'enable': {
                if (!update.id)
                    return state.map((obj) => {
                        obj.effect.enabled = true
                        return obj
                    })
                const existing = state.find(({ id }) => id === update.id)
                if (!existing) return state
                existing.effect.enabled = true
                return [...state]
            }
            case 'disable': {
                if (!update.id)
                    return state.map((obj) => {
                        obj.effect.enabled = false
                        return obj
                    })
                const existing = state.find(({ id }) => id === update.id)
                if (!existing) return state
                existing.effect.enabled = false
                return [...state]
            }
        }
    }, [])

    useEffect(() => {
        if (!canvas) return

        const onResize = () => {
            canvas.width = window.devicePixelRatio * window.innerWidth
            canvas.height = window.devicePixelRatio * window.innerHeight
        }
        onResize()

        window.addEventListener('resize', onResize)

        const elfetti = new ElfettiEffect(canvas)
        updateEffects({
            action: 'add',
            effect: [elfetti],
        })

        // const onClick = (event: MouseEvent | TouchEvent) => {
        //     const pos = Object.prototype.hasOwnProperty.call(event, 'touches')
        //         ? {
        //             x: (event as TouchEvent).touches[0].clientX,
        //             y: (event as TouchEvent).touches[0].clientY,
        //         }
        //         : {
        //             x: (event as MouseEvent).clientX,
        //             y: (event as MouseEvent).clientY,
        //         }
        //     elfetti.trigger({
        //         x: pos.x * window.devicePixelRatio,
        //         y: pos.y * window.devicePixelRatio,
        //     })
        // }
        // window.addEventListener('click', onClick)

        return () => {
            window.removeEventListener('resize', onResize)
            // window.removeEventListener('click', onClick)
        }
    }, [canvas])

    const effectsRef = useRef(effects)
    effectsRef.current = effects

    useEffect(() => {
        if (!canvas || !screensaverActive) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ;(effectsRef.current[0]?.effect as any).trigger?.({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
        })
        const update = (delta: number) => {
            // canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
            ctx.save()
            // ctx.globalAlpha = 0.98
            ctx.globalCompositeOperation = 'copy'
            ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height)
            ctx.restore()
            effectsRef.current.forEach(({ effect }) => effect.update(delta))
        }

        let animation: any
        let lastUpdate = 0
        const loop = (timestamp = 0) => {
            lastUpdate = lastUpdate || timestamp
            update((timestamp - lastUpdate) / 1000)
            lastUpdate = timestamp
            animation = requestAnimationFrame(loop)
        }
        loop()

        const onClick = () => toggleScreensaver(false)
        canvas.addEventListener('click', onClick)

        return () => {
            canvas.removeEventListener('click', onClick)
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            cancelAnimationFrame(animation)
        }
    }, [canvas, screensaverActive])

    return (
        <EffectsContext.Provider
            value={{
                canvas,
                effects,
                updateEffects,
                screensaverActive,
                toggleScreensaver,
            }}
        >
            <Canvas ref={setCanvas} $active={screensaverActive} />
            {children}
        </EffectsContext.Provider>
    )
}

const Canvas = styled.canvas<{ $active: boolean }>`
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    pointer-events: ${({ $active }) => ($active ? 'all' : 'none')};

    z-index: 10000;
`
