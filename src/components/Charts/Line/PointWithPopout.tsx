import { useState } from 'react'
import { type Point } from '@nivo/line'

import styled from 'styled-components'
import { ChartTooltip } from '../ChartTooltip'

type PointProps = Point & {
    formatX?: (value: string | number) => string
    formatY?: (value: string | number) => string
}
export const PointWithPopout = ({ serieId, x, y, data, serieColor, formatX, formatY }: PointProps) => {
    const [hovered, setHovered] = useState(false)

    return (
        <g x={0} y={0} transform={`translate(${x}, ${y})`}>
            <Circle $hovered={hovered} r={12} fill="white" stroke="black" strokeWidth={2} />
            <TooltipContainer
                x={-12}
                y={-12}
                onPointerEnter={() => setHovered(true)}
                onPointerLeave={() => setHovered(false)}
            >
                <ChartTooltip
                    active={hovered}
                    heading={formatY ? formatY(data.yFormatted) : data.yFormatted}
                    subHeading={serieId}
                    label={formatX ? formatX(data.xFormatted) : data.xFormatted}
                    color={serieColor}
                    size={24}
                />
            </TooltipContainer>
        </g>
    )
}

const Circle = styled.circle<{ $hovered?: boolean }>`
    opacity: ${({ $hovered }) => ($hovered ? 1 : 0)};
    &:hover {
        opacity: 1;
    }
`

const TooltipContainer = styled.foreignObject`
    width: 24px;
    height: 24px;
    overflow: visible;
    z-index: 2;
`
