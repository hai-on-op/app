import { clamp } from '~/utils'

import styled from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'

export type ProgressBarProps = {
    progress: number,
    simulatedProgress?: number,
    colorLimits?: [number, number],
    labels?: {
        progress: number,
        label: string,
    }[],
}
export function ProgressBar({
    progress,
    simulatedProgress,
    colorLimits,
    labels,
}: ProgressBarProps) {
    return (
        <Container>
            <Inner>
                <Bar
                    $progress={progress}
                    $limits={colorLimits}
                />
                {simulatedProgress !== undefined && (
                    <Bar
                        $progress={simulatedProgress}
                        style={{ zIndex: simulatedProgress > progress ? -1: 1 }}
                    />
                )}
            </Inner>
            {labels?.map(({ progress: p, label }, i) => (
                <Indicator
                    key={i}
                    $left={`${(p * 100).toFixed(2)}%`}>
                    <Text $fontSize="8px">{label}</Text>
                </Indicator>
            ))}
        </Container>
    )
}

const Container = styled(CenteredFlex)`
    position: relative;
    width: 100%;
    height: 16px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 999px;
    background-color: transparent;
    overflow: visible;
`
const Inner = styled.div`
    position: relative;
    width: calc(100% + 4px);
    height: calc(100% + 4px);
    flex-shrink: 0;
    border-radius: 999px;
    overflow: hidden;
`
// green = rgb(192, 243, 187), red = rgb(255, 0, 0)
const Bar = styled.div<{ $progress: number, $limits?: [number, number] }>`
    position: absolute;
    top: 0px;
    left: 0px;
    bottom: 0px;
    width: ${({ $progress }) => (Math.min($progress, 1) * 100).toFixed(2)}%;
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
const Indicator = styled(Flex).attrs(props => ({
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
