import type { ReactChildren } from '~/types'
import { clamp } from '~/utils'

import styled from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'

export type ProgressBarProps = {
    progress: number
    simulatedProgress?: number
    colorLimits?: [number, number]
    overlayLabel?: ReactChildren
    labels?: {
        progress: number
        label: ReactChildren
    }[]
}
export function ProgressBar({ progress, simulatedProgress, colorLimits, overlayLabel, labels }: ProgressBarProps) {
    return (
        <Container>
            <Inner>
                <Bar $progress={progress} $limits={colorLimits} />
                {simulatedProgress !== undefined && (
                    <Bar $progress={simulatedProgress} style={{ zIndex: simulatedProgress > progress ? -1 : 1 }} />
                )}
                {!!overlayLabel && <OverlayLabel>{overlayLabel}</OverlayLabel>}
            </Inner>
            {labels?.map(({ progress: p, label }, i) => (
                <Indicator key={i} $left={`${(p * 100).toFixed(2)}%`}>
                    <Text $fontSize="8px">{label}</Text>
                </Indicator>
            ))}
        </Container>
    )
}

const Container = styled(CenteredFlex)`
    position: relative;
    width: 100%;
    min-width: 100px;
    height: 16px;
    border-radius: 999px;
    background-color: transparent;
    overflow: visible;
`
const Inner = styled.div`
    position: absolute;
    inset: 0px;
    border: ${({ theme }) => theme.border.medium};
    flex-shrink: 0;
    border-radius: 999px;
    overflow: hidden;
`
// green = rgb(192, 243, 187), red = rgb(255, 0, 0)
const Bar = styled.div<{ $progress: number; $limits?: [number, number] }>`
    position: absolute;
    top: -2px;
    left: -20px;
    bottom: -2px;
    width: ${({ $progress }) => {
        const p = Math.min($progress, 1)
        return `calc(20px + ${2 * p}px + ${(100 * p).toFixed(2)}%)`
    }};
    border-radius: 999px;
    border: ${({ theme }) => theme.border.medium};
    background: ${({ $progress, $limits = [0, 1] }) => {
        const p = clamp(($progress - $limits[0]) / ($limits[1] - $limits[0]), 0, 1)
        return `rgb(${255 - (255 - 192) * p}, ${243 * p}, ${187 * p})`
    }};
    transition: all 1s ease;
    z-index: 0;

    &:nth-child(2) {
        background: ${({ theme }) => theme.colors.gradient};
    }
`
const OverlayLabel = styled(CenteredFlex)`
    position: absolute;
    inset: 0px;
    z-index: 0;
`
const Indicator = styled(Flex).attrs((props) => ({
    $column: true,
    $justify: 'flex-end',
    $align: 'center',
    ...props,
}))<{ $left: string }>`
    position: absolute;
    top: 0px;
    bottom: -16px;
    left: ${({ $left }) => $left};
    transform: translateX(-50%);

    &::after {
        content: '';
        width: 1px;
        position: absolute;
        top: 0px;
        bottom: 16px;
        background-color: black;
    }

    z-index: 1;
`
