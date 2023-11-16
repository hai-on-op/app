import styled from 'styled-components'
import { type DashedContainerProps, DashedContainerStyle, Flex, Grid, HaiButton, Text } from '~/styles'
import { RewardsTokenPair } from '~/components/TokenPair'
import { Tooltip } from '~/components/Tooltip'

export function BorrowStats() {
    return (
        <Container $borderOpacity={0.2}>
            <Stat>
                <StatText>
                    <StatHeaderText>$45,600</StatHeaderText>
                    <Flex $gap={8}>
                        <Text>My Farm TVL</Text>
                        <Tooltip width="120px">
                            Hello world
                        </Tooltip>
                    </Flex>
                </StatText>
            </Stat>
            <Stat>
                <StatText>
                    <StatHeaderText>7.8%</StatHeaderText>
                    <Flex>
                        <Text>My Net Farm APY</Text>
                    </Flex>
                </StatText>
            </Stat>
            <Stat>
                <StatText>
                    <Flex
                        $align="center"
                        $gap={12}>
                        <StatHeaderText>$7,000</StatHeaderText>
                        <RewardsTokenPair
                            tokens={['OP', 'KITE']}
                            hideLabel
                        />
                    </Flex>
                    <Flex>
                        <Text>My Farm Rewards</Text>
                    </Flex>
                </StatText>
                <HaiButton $variant="yellowish">Claim</HaiButton>
            </Stat>
        </Container>
    )
}

const Container = styled(Grid)<DashedContainerProps>`
    ${DashedContainerStyle}
    width: 100%;
    grid-template-columns: 1fr 1fr 1fr;

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        grid-template-columns: 1fr;
    `}
`

const Stat = styled(Flex).attrs(props => ({
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