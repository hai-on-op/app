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
}

type StatsProps = FlexProps & {
    stats?: StatProps[]
    columns?: string
    children?: ReactNode[]
}
export function Stats({ stats, columns, children, ...props }: StatsProps) {
    return (
        <Container
            $borderOpacity={0.2}
            $columns={columns || `repeat(${(stats || []).length + (children || []).length}, 1fr)`}
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
    const { header, headerStatus, label, tooltip, button } = stat
    return (
        <StatContainer $unbordered={unbordered} $hasButton={!!button} {...props}>
            <StatText>
                <Flex $align="center" $gap={12}>
                    <StatHeaderText>{header}</StatHeaderText>
                    {headerStatus}
                </Flex>
                <Flex $gap={8}>
                    <Text>{label}</Text>
                    {!!tooltip && <Tooltip width="200px">{tooltip}</Tooltip>}
                </Flex>
            </StatText>
            {button}
        </StatContainer>
    )
}

const Container = styled(Grid)<DashedContainerProps>`
    ${DashedContainerStyle}
    width: 100%;

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

const StatContainer = styled(Flex).attrs((props: FlexProps) => ({
    $justify: 'space-between',
    $align: 'center',
    $gap: 12,
    $flexWrap: true,
    ...props,
}))<{ $unbordered?: boolean; $hasButton?: boolean }>`
    padding: 20px 24px;

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

    ${({ theme, $hasButton }) => theme.mediaWidth.upToSmall`
        padding: 12px 16px;
    ${
        $hasButton
            ? css`
                  grid-column: 1 / -1;
              `
            : // : css`justify-content: center;`
              ``
    }
    `}
`
const StatText = styled(Flex).attrs((props) => ({
    $column: true,
    $justify: 'center',
    $align: 'flex-start',
    $gap: 12,
    ...props,
}))`
    font-size: 0.7rem;
`
const StatHeaderText = styled(Text).attrs((props) => ({
    $fontSize: '2.2em',
    $fontWeight: 700,
    ...props,
}))``
