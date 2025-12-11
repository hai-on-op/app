import styled from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'
import { Tooltip } from './Tooltip'

type TransactionItem = {
    label: string
    tooltip?: string
    icon?: JSX.Element
    isDone?: boolean
    value: {
        current?: string
        after: string
        label?: JSX.Element | string
        tooltip?: string
    }
}

const DEFAULT_HEADING = 'Transaction Summary'

type TransactionSummaryProps = {
    heading?: string
    items: TransactionItem[]
}
export function TransactionSummary({ heading = DEFAULT_HEADING, items }: TransactionSummaryProps) {
    return (
        <Container>
            <Text $fontWeight={700}>{heading}</Text>
            <Inner>
                {items.map(({ label, tooltip, icon, isDone, value }, i) => (
                    <Detail key={i} $isDone={!!isDone}>
                        <CenteredFlex $gap={8}>
                            {icon}
                            <CenteredFlex $gap={4}>
                                <Text className="label">{label}</Text>
                                {!!tooltip && (
                                    <Tooltip $width="200px" $float="right">
                                        {tooltip}
                                    </Tooltip>
                                )}
                            </CenteredFlex>
                        </CenteredFlex>
                        <Flex $justify="flex-end" $align="center" $gap={4}>
                            {!!value.current && (
                                <>
                                    <Text className="current-value">{value.current}</Text>
                                    <Text>→</Text>
                                </>
                            )}
                            <Text>{value.after}</Text>
                            {!!value.label &&
                                (typeof value.label === 'string' ? <Text>{value.label}</Text> : value.label)}
                            {!!value.tooltip && (
                                <Tooltip width="200px" $float="left">
                                    {value.tooltip}
                                </Tooltip>
                            )}
                        </Flex>
                    </Detail>
                ))}
            </Inner>
        </Container>
    )
}

const Container = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 12,
    ...props,
}))`
    padding: 12px;
    border-radius: 8px;
    background-color: white;
    font-size: ${({ theme }) => theme.font.small};
`
const Inner = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 4,
    ...props,
}))``

const Detail = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    ...props,
}))<{ $isDone?: boolean }>`
    .label {
        text-decoration: ${({ $isDone }) => ($isDone ? 'line-through' : 'none')};
    }
    .current-value {
        text-decoration: ${({ $isDone }) => ($isDone ? 'line-through' : 'none')};
    }

    & > *:nth-child(2) {
        font-weight: 700;
    }
`
