import { CenteredFlex, Flex, Text } from '~/styles'
import { TokenPair } from '~/components/TokenPair'
import { Tooltip } from '~/components/Tooltip'

type PriceDisplayProps = {
    token?: string,
    price: string,
    label: string,
    tooltip: string
}
export function PriceDisplay({ token = 'HAI', price, label, tooltip }: PriceDisplayProps) {
    return (
        <CenteredFlex $gap={12}>
            <TokenPair
                size={96}
                tokens={[token as any]}
                hideLabel
            />
            <Flex
                $column
                $justify="center"
                $align="flex-start"
                $gap={4}>
                <Text
                    $fontSize="1.54rem"
                    $fontWeight={700}>
                    {price || '--'}
                </Text>
                <Flex
                    $align="center"
                    $gap={4}>
                    <Text $fontSize="0.7em">{label}</Text>
                    <Tooltip width="200px">{tooltip}</Tooltip>
                </Flex>
            </Flex>
        </CenteredFlex>
    )
}
