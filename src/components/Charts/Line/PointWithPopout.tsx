import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { type Point } from '@nivo/line'

import styled from 'styled-components'
import { ChartTooltip } from '../ChartTooltip'

type PointProps = Point & {
    formatX?: (value: string | number) => string,
    formatY?: (value: string | number) => string
}
export const PointWithPopout = ({ serieId, x, y, data, serieColor, formatX, formatY }: PointProps) => {
    const [hovered, setHovered] = useState(false)
    const [circle, setCircle] = useState<SVGCircleElement>()
    const [container, setContainer] = useState<HTMLElement>()

    useEffect(() => {
        if (!circle || !container) return

        const onResize = () => {
            const { left, top, width, height } = circle.getBoundingClientRect()
            Object.assign(container.style, {
                top: `${top + window.scrollY}px`,
                left: `${left}px`,
                width: `${width}px`,
                height: `${height}px`
            })
        }
        onResize()
        window.addEventListener('resize', onResize)

        return () => window.removeEventListener('resize', onResize)
    }, [circle, container, x, y])

    return (<>
        <Circle
            ref={setCircle as any}
            $hovered={hovered}
            x={0}
            y={0}
            r={12}
            transform={`translate(${x}, ${y})`}
            fill="white"
            stroke="black"
            strokeWidth={2}
        />
        {createPortal(
            <ChartTooltip
                ref={setContainer as any}
                onPointerEnter={() => setHovered(true)}
                onPointerLeave={() => setHovered(false)}
                active={hovered}
                heading={formatY ? formatY(data.yFormatted): data.yFormatted}
                subHeading={serieId}
                label={formatX ? formatX(data.xFormatted): data.xFormatted}
                color={serieColor}
                size={10}
            />,
            document.body
        )}
    </>)
}

const Circle = styled.circle<{ $hovered?: boolean }>`
    opacity: ${({ $hovered }) => $hovered ? 1: 0};
    &:hover {
        opacity: 1;
    }
`
