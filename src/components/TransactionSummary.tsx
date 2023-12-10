import styled from 'styled-components'
import { Flex, Text } from '~/styles'

type TransactionItem = {
    label: string,
    value: {
        current?: string,
        after: string,
        label?: string,
    },
}

type TransactionSummaryProps = {
    items: TransactionItem[],
}
export function TransactionSummary({ items }: TransactionSummaryProps) {
    return (
        <Container>
            <Text $fontWeight={700}>
                Transaction Summary
            </Text>
            <Inner>
                {items.map(({ label, value }, i) => (
                    <Detail key={i}>
                        <Text>{label}</Text>
                        <Flex
                            $justify="flex-end"
                            $align="center"
                            $gap={4}>
                            {!!value.current && (<>
                                <Text>{value.current}</Text>
                                <Text>→</Text>
                            </>)}
                            <Text>{value.after}</Text>
                            {!!value.label && <Text>{value.label}</Text>}
                        </Flex>
                    </Detail>
                ))}
            </Inner>
        </Container>
    )
}

const Container = styled(Flex).attrs(props => ({
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
const Inner = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 4,
    ...props,
}))``

const Detail = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    ...props,
}))`
    & > *:nth-child(2) {
        font-weight: 700;
    }
`
