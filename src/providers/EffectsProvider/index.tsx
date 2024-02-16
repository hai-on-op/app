import { createContext, useContext, useEffect, useRef, useState } from 'react'

import type { ReactChildren, SetState } from '~/types'
import { ElfettiEffect } from './Elfetti'

import styled from 'styled-components'

type EffectsContext = {
    canvas: HTMLCanvasElement | null
    screensaverActive: boolean
    toggleScreensaver: SetState<boolean>
}

const defaultState: EffectsContext = {
    canvas: null,
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
    const [screensaver, setScreensaver] = useState<ElfettiEffect>()
    const screensaverRef = useRef(screensaver)
    screensaverRef.current = screensaver

    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)

    useEffect(() => {
        if (!canvas) return

        if (screensaverRef.current) screensaverRef.current.updateCanvas(canvas)
        else setScreensaver(new ElfettiEffect(canvas))

        const onResize = () => {
            canvas.width = window.devicePixelRatio * window.innerWidth
            canvas.height = window.devicePixelRatio * window.innerHeight
        }
        onResize()

        window.addEventListener('resize', onResize)

        return () => {
            window.removeEventListener('resize', onResize)
            // window.removeEventListener('click', onClick)
        }
    }, [canvas])

    useEffect(() => {
        if (!canvas || !screensaverActive || !screensaver) return

        const ctx = screensaver.ctx
        screensaver.trigger({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
        })

        const update = (delta: number) => {
            // ctx.save()
            // ctx.globalAlpha = 0.98
            // ctx.globalCompositeOperation = 'copy'
            // ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height)
            // ctx.restore()
            screensaver.update(delta)
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
    }, [canvas, screensaverActive, screensaver])

    return (
        <EffectsContext.Provider
            value={{
                canvas,
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
