import { type ReactNode } from 'react'

import type { ReactChildren } from '~/types'

import styled, { css } from 'styled-components'
import { type DashedContainerProps, DashedContainerStyle, Flex, type FlexProps, Grid, Text } from '~/styles'
import { Tooltip } from '~/components/Tooltip'

export type StatProps = {
    header: ReactChildren
    headerStatus?: ReactChildren
    label: string
    tooltip?: ReactChildren
    button?: ReactChildren
    fullWidth?: boolean
}

type StatsProps = FlexProps & {
    stats?: StatProps[]
    columns?: string
    children?: ReactNode[]
    fun?: boolean
}
export function Stats({ stats, columns, children, fun = false, ...props }: StatsProps) {
    return (
        <Container
            $borderOpacity={0.2}
            $columns={columns || `repeat(${(stats || []).length + (children || []).length}, 1fr)`}
            $fun={fun}
        >
            {stats?.map((stat, i) => <Stat key={i} stat={stat} {...props} />)}
            {children}
        </Container>
    )
}

type StatElProps = FlexProps & {
    stat: StatProps
    unbordered?: boolean
}
export function Stat({ stat, unbordered, ...props }: StatElProps) {
    const { header, headerStatus, label, tooltip, button, fullWidth } = stat

    return (
        <StatContainer $unbordered={unbordered} $fullWidth={fullWidth || !!button} {...props}>
            <Flex $width="100%" $column $justify="flex-end" $align="flex-start" $gap={12} $fontSize="0.7rem">
                <Flex $width="100%" $justify="flex-start" $align="center" $gap={12}>
                    {typeof header === 'string' ? <StatHeader>{header}</StatHeader> : header}
                    {headerStatus}
                </Flex>
                <Flex $justify="flex-start" $align="center" $gap={8}>
                    <Text>{label}</Text>
                    {!!tooltip && <Tooltip width="200px">{tooltip}</Tooltip>}
                </Flex>
            </Flex>
            {button}
        </StatContainer>
    )
}

const StatContainer = styled(Flex).attrs((props: FlexProps) => ({
    $justify: 'space-between',
    $align: 'center',
    $gap: 12,
    ...props,
}))<{ $unbordered?: boolean; $fullWidth?: boolean }>`
    height: 100%;
    padding: 20px 24px;

    & > *:first-child {
        height: 100%;
    }

    ${({ $unbordered }) =>
        !$unbordered &&
        css`
            ${DashedContainerStyle}
            &::after {
                opacity: 0.2;
                border-left: none;
                border-bottom: none;
            }
        `}

    ${({ theme, $fullWidth }) => theme.mediaWidth.upToSmall`
        padding: 12px 16px;
        flex-direction: column;
        align-items: flex-start;
        ${
            $fullWidth &&
            css`
                grid-column: 1 / -1;
            `
        }
    `}
`
const Container = styled(Grid)<DashedContainerProps & { $fun: boolean }>`
    ${DashedContainerStyle}
    width: 100%;

    ${({ theme, $fun }) =>
        $fun &&
        css`
            &::before {
                content: '';
                position: absolute;
                inset: 0px;
                background-image: url('/assets/hai-tabs.png');
                background-position: center;
                background-size: contain;
                background-repeat: repeat;
                z-index: -1;
            }
            & ${StatContainer} {
                &:nth-child(4n + 1) {
                    background: ${theme.colors.greenish}44;
                }
                &:nth-child(4n + 2) {
                    background: ${theme.colors.blueish}44;
                }
                &:nth-child(4n + 3) {
                    background: ${theme.colors.orangeish}44;
                }
                &:nth-child(4n) {
                    background: ${theme.colors.pinkish}44;
                }
            }
        `}
    &::after {
        border-top: none;
        border-right: none;
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        grid-template-columns: 1fr 1fr;
    `}
    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        grid-template-columns: 1fr;
    `}
`

const StatHeader = styled(Text).attrs((props) => ({
    $fontSize: '2.2em',
    $fontWeight: 700,
    ...props,
}))``

Stat.Header = StatHeader
