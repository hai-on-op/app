import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { type Point } from '@nivo/line'

import styled from 'styled-components'
import { CenteredFlex, Popout, Text } from '~/styles'

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
            <PopoutContainer
                ref={setContainer as any}
                onPointerEnter={() => setHovered(true)}
                onPointerLeave={() => setHovered(false)}>
                <GraphPopout hidden={!hovered}>
                    <Text
                        $fontSize="1.4em"
                        $fontWeight={700}>
                        {formatY ? formatY(data.yFormatted): data.yFormatted}
                    </Text>
                    <Text
                        $fontSize="0.8em"
                        $color={serieColor}>
                        {serieId}
                    </Text>
                    <Text $fontSize="0.8em">
                        {formatX ? formatX(data.xFormatted): data.xFormatted}
                    </Text>
                </GraphPopout>
            </PopoutContainer>,
            document.body
        )}
    </>)
}

const PopoutContainer = styled(CenteredFlex)`
    width: 0px;
    height: 0px;
    position: absolute;
    overflow: visible;

    z-index: 2;
`
const GraphPopout = styled(Popout).attrs(props => ({
    $width: 'auto',
    $anchor: 'bottom',
    $margin: '20px',
    $gap: 4,
    $shrink: 0,
    ...props
}))`
    min-width: fit-content;
    padding: 12px 24px;
    & > ${Text} {
        white-space: nowrap;
        &:nth-child(2) {
            filter: brightness(75%);
        }
    }
`
const Circle = styled.circle<{ $hovered?: boolean }>`
    opacity: ${({ $hovered }) => $hovered ? 1: 0};
    &:hover {
        opacity: 1;
    }
`