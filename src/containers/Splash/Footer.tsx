import styled from 'styled-components'
import { Flex, Text } from '~/styles'

import haiLogo from '~/assets/logo.png'

export function Footer() {
    return (
        <Container as="footer">
            <Inner>
                <Flex
                    $column
                    $align="flex-start"
                    $gap={24}
                    style={{ maxWidth: '400px' }}>
                    <img
                        src={haiLogo}
                        width={701}
                        height={264}
                        alt="HAI"
                        style={{ width: '200px', height: 'auto' }}
                    />
                    <Text
                        $fontSize="0.8rem"
                        $fontWeight={700}>
                        HAI is a multi-collateral, over-collateralized CDP-minted stablecoin, using a PID controller to induce stability.
                    </Text>
                    <Text $fontSize="0.8rem">
                        {`HAI adopts a mechanism familiar to stablecoin protocols; it is minted from over-collateralized debt positions (CDPs). In essence, every HAI token in circulation corresponds to a greater amount of collateral locked by individual protocol users, also known as minters. These minters can generate or annihilate HAI, depending on their collateral's value. This approach aligns with systems employed by other cryptocurrencies like DAI, RAI, and many others.`}
                    </Text>
                </Flex>
            </Inner>
            <Bottom>© 2023 HAI</Bottom>
        </Container>
    )
}

const Container = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'stretch',
    $align: 'stretch',
    ...props
}))`
    position: relative;
    background: linear-gradient(90deg, #F2D86A 0%, #FFC3AB 100%);
    z-index: 3;
`

const Inner = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'stretch',
    $align: 'flex-start',
    $gap: 48,
    ...props
}))`
    padding: 48px;
`

const Bottom = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'flex-start',
    $align: 'center',
    ...props
}))`
    padding: 24px 48px;
    border-top: ${({ theme }) => theme.border.thin};
`