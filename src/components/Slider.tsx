import { useCallback, useEffect, useRef, useState } from 'react'
import { clamp } from '~/utils'
import styled from 'styled-components'
import { CenteredFlex } from '~/styles'

export type SliderProps = {
    min: number
    max: number
    step?: number
    value: number
    onChange: (value: number) => void
    disabled?: boolean
}

export function Slider({ min, max, step = 1, value, onChange, disabled }: SliderProps) {
    const [isDragging, setIsDragging] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const progress = (value - min) / (max - min)

    const updateValue = useCallback(
        (clientX: number) => {
            if (!containerRef.current) return

            const rect = containerRef.current.getBoundingClientRect()
            const x = clientX - rect.left
            const percentage = clamp(x / rect.width, 0, 1)
            const rawValue = min + (max - min) * percentage
            const steppedValue = Math.round(rawValue / step) * step
            const clampedValue = clamp(steppedValue, min, max)

            onChange(clampedValue)
        },
        [min, max, step, onChange]
    )

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (disabled) return
            setIsDragging(true)
            updateValue(e.clientX)
        },
        [disabled, updateValue]
    )

    useEffect(() => {
        if (!isDragging) return

        const handleMouseMove = (e: MouseEvent) => {
            updateValue(e.clientX)
        }

        const handleMouseUp = () => {
            setIsDragging(false)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging, updateValue])

    return (
        <Container ref={containerRef} onMouseDown={handleMouseDown} $disabled={disabled}>
            <Inner>
                <Bar $progress={progress} />
                <Handle $progress={progress} $active={isDragging} />
            </Inner>
        </Container>
    )
}

const Container = styled(CenteredFlex)<{ $disabled?: boolean }>`
    position: relative;
    width: 100%;
    min-width: 100px;
    height: 16px;
    border-radius: 999px;
    background-color: transparent;
    overflow: visible;
    cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
    opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
`

const Inner = styled.div`
    position: absolute;
    inset: 0px;
    border: ${({ theme }) => theme.border.medium};
    flex-shrink: 0;
    border-radius: 999px;
    overflow: visible;
`

const Bar = styled.div<{ $progress: number }>`
    position: absolute;
    top: -2px;
    left: -2px;
    bottom: -2px;
    width: ${({ $progress }) => {
        const p = Math.min($progress, 1)
        return `calc(20px + ${2 * p}px + ${(100 * p).toFixed(2)}% - 10px)`
    }};
    border-radius: 999px;
    border: ${({ theme }) => theme.border.medium};
    background: ${({ theme }) => theme.colors.yellowish};
    transition: width 0.1s ease;
    z-index: 0;
`

const Handle = styled.div<{ $progress: number; $active: boolean }>`
    position: absolute;
    top: 50%;
    left: ${({ $progress }) => `calc(${($progress * 100).toFixed(2)}%)`};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    border: ${({ theme }) => theme.border.medium};
    transform: translate(-50%, -50%);
    transition: ${({ $active }) => ($active ? 'none' : 'all 0.1s ease')};
    z-index: 1;

    &:hover {
        transform: translate(-50%, -50%) scale(1.2);
    }
`
