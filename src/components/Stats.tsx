import { type ReactNode } from 'react'

import type { ReactChildren } from '~/types'

import styled from 'styled-components'
import { type DashedContainerProps, DashedContainerStyle, Flex, Grid, Text } from '~/styles'
import { Tooltip } from '~/components/Tooltip'

export type StatProps = {
    header: ReactChildren,
    headerStatus?: ReactChildren,
    label: string,
    tooltip?: string,
    button?: ReactChildren
}

type StatsProps = {
    stats?: StatProps[],
    columns?: string,
    children?: ReactNode[]
}
export function Stats({ stats, columns, children }: StatsProps) {
    return (
        <Container
            $borderOpacity={0.2}
            $columns={columns || `repeat(${(stats || []).length + (children || []).length}, 1fr)`}>
            {stats?.map((stat, i) => (
                <Stat
                    key={i}
                    stat={stat}
                />
            ))}
            {children}
        </Container>
    )
}

export function Stat({ stat }: { stat: StatProps }) {
    const { header, headerStatus, label, tooltip, button } = stat
    return (
        <StatContainer>
            <StatText>
                <Flex
                    $align="center"
                    $gap={12}>
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

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        grid-template-columns: 1fr;
    `}
`

const StatContainer = styled(Flex).attrs(props => ({
    $justify: 'space-between',
    $align: 'center',
    $gap: 12,
    $flexWrap: true,
    ...props
}))`
    padding: 20px 24px;
    &:not(:first-of-type) {
        ${DashedContainerStyle}
        border-top: 2px solid transparent;
        border-bottom: 2px solid transparent;
        &::after {
            opacity: 0.2;
            border-top: none;
            border-right: none;
            border-bottom: none;
        }
    }

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        border-left: none;
        border-top: 2px dashed rgba(0,0,0,0.1);
    `}
`
const StatText = styled(Flex).attrs(props => ({
    $column: true,
    $justify: 'center',
    $align: 'flex-start',
    $gap: 12,
    ...props
}))`
    font-size: 0.7rem;
`
const StatHeaderText = styled(Text).attrs(props => ({
    $fontSize: '2.2em',
    $fontWeight: 700,
    ...props
}))``