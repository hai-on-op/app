import type { ReactChildren } from '~/types'

import styled from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'

const progressToPercentage = (progress: number) => (progress * 100).toFixed(2) + '%'

type Progress = {
    progress: number
    label: ReactChildren
}

export type ProgressIndicatorProps = {
    progress: Progress
    simulatedProgress?: Progress
    colorLimits: [number, number, number]
    labels?: Progress[]
}
export function ProgressIndicator({ progress, simulatedProgress, colorLimits, labels }: ProgressIndicatorProps) {
    return (
        <Container>
            <Inner $limits={colorLimits.map(progressToPercentage) as any} />
            <Indicator
                $left={progressToPercentage(progress.progress)}
                style={simulatedProgress ? { opacity: 0.6 } : undefined}
            >
                <Text $whiteSpace="nowrap">{progress.label}</Text>
            </Indicator>
            {simulatedProgress !== undefined && (
                <Indicator $left={progressToPercentage(simulatedProgress.progress)}>
                    <Text $whiteSpace="nowrap">{simulatedProgress.label}</Text>
                </Indicator>
            )}
            {labels?.map(({ progress: p, label }, i) => (
                <Label key={i} $left={progressToPercentage(p)}>
                    <Text $whiteSpace="nowrap">{label}</Text>
                </Label>
            ))}
        </Container>
    )
}

const CONTAINER_SIZE = 72
const BAR_SIZE = 12

const Container = styled(CenteredFlex)`
    position: relative;
    width: 100%;
    height: ${CONTAINER_SIZE}px;
    background-color: transparent;
    overflow: visible;

    z-index: 0;
`
const Inner = styled.div<{ $limits: [string, string, string] }>`
    position: relative;
    width: 100%;
    height: ${BAR_SIZE}px;
    border: ${({ theme }) => theme.border.medium};
    background: ${({ theme, $limits }) => `linear-gradient(
        90deg,
        ${theme.colors.reddish}aa 0%,
        ${theme.colors.reddish}aa ${$limits[0]},
        ${theme.colors.yellowish}aa ${$limits[1]},
        ${theme.colors.greenish}aa ${$limits[2]},
        ${theme.colors.greenish}aa 100%
    )`};
    flex-shrink: 0;
    border-radius: 999px;
    overflow: hidden;
`
const Indicator = styled(Flex).attrs((props) => ({
    $column: true,
    $justify: 'flex-end',
    $align: 'center',
    $fontSize: '14px',
    $fontWeight: 700,
    ...props,
}))<{ $left: string }>`
    position: absolute;
    top: 0px;
    left: clamp(${BAR_SIZE / 2}px, ${({ $left }) => $left}, calc(100% - ${BAR_SIZE / 2}px));
    bottom: ${(CONTAINER_SIZE - BAR_SIZE) / 2}px;
    padding-bottom: ${BAR_SIZE + 6}px;
    transform: translateX(-50%);
    transition: all 0.5s ease;

    &::before {
        content: '';
        width: 1px;
        height: ${BAR_SIZE + 4}px;
        position: absolute;
        bottom: 0px;
        background-color: black;
    }
    &::after {
        content: '';
        width: 8px;
        height: 6px;
        position: absolute;
        bottom: ${BAR_SIZE}px;
        background: conic-gradient(at 50% 100%, black 8.33%, transparent 8.33%, transparent 91.67%, black 91.67%);
    }

    &:nth-child(3) > ${Text} {
        padding: 0px 16px;
        background: ${({ theme }) => `radial-gradient(
            ${theme.colors.background} 0%,
            ${theme.colors.background} 40%,
            transparent 80%
        )`};
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        font-size: 11px;
    `}

    z-index: 1;
`
const Label = styled(Flex).attrs((props) => ({
    $column: true,
    $justify: 'flex-start',
    $align: 'center',
    $fontSize: '10px',
    ...props,
}))<{ $left: string }>`
    position: absolute;
    top: ${(CONTAINER_SIZE - BAR_SIZE) / 2}px;
    left: ${({ $left }) => $left};
    transform: translateX(-50%);
    padding-top: ${BAR_SIZE + 6}px;

    &::after {
        content: '';
        width: 1px;
        position: absolute;
        top: 0px;
        height: ${BAR_SIZE + 4}px;
        background-color: black;
    }

    ${({ theme }) => theme.mediaWidth.upToMedium`
        font-size: 9px;
    `}
    ${({ theme }) => theme.mediaWidth.upToSmall`
        font-size: 8px;
    `}

    z-index: 1;
`
