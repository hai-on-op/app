import { type CSSProperties } from 'react'

import styled from 'styled-components'
import { Flex, type FlexProps, Text } from '~/styles'

type LegendProps = FlexProps & {
    data: {
        id: string
        label?: string
        color: string
    }[]
    style?: CSSProperties
}
export const Legend = ({ data, ...props }: LegendProps) => (
    <Container $justify="flex-start" $align="flex-start" $gap={12} {...props}>
        {data.map(({ id, label, color }) => (
            <Entry key={id} $color={color}>
                <Text $whiteSpace="nowrap">{label || id}</Text>
            </Entry>
        ))}
    </Container>
)

const Container = styled(Flex)`
    position: absolute;
    top: 24px;
    left: 24px;
    pointer-events: none;
`

const Entry = styled(Text)`
    width: 100%;
    height: 24px;
    padding: 0 16px;
    border-radius: 999px;
    background-color: white;
    box-shadow: 0 3px 7px rgba(0, 0, 0, 0.1);
    line-height: 24px;
    font-size: 0.7rem;
    font-weight: 700;

    & > ${Text} {
        filter: brightness(75%);
    }
`
