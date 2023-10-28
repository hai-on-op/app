import styled from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, Text } from '~/styles'
import { Elf } from '~/components/Elf'
import Twitter from '~/components/Icons/Twitter'
import Telegram from '~/components/Icons/Telegram'

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
                    <Logo
                        src={haiLogo}
                        width={701}
                        height={264}
                        alt="HAI"
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
                <Flex
                    $width="100%"
                    $column
                    $justify="space-between"
                    $align="stretch"
                    $gap={48}
                    style={{ maxWidth: 'min(calc(100vw - 48px), 480px)' }}>
                    <Grid
                        $columns="1fr 1fr min-content"
                        $gap={12}>
                        <Flex
                            $column
                            $gap={12}>
                            <Text $fontWeight={700}>About</Text>
                            <Text>Privacy</Text>
                            <Text>Terms</Text>
                        </Flex>
                        <Flex
                            $column
                            $gap={12}>
                            <Text $fontWeight={700}>Resources</Text>
                            <Text>Docs</Text>
                        </Flex>
                        <IconContainer>
                            <Twitter/>
                            <Telegram/>
                        </IconContainer>
                    </Grid>
                    <EmailContainer>
                        <Text $fontWeight={700}>EMAIL GOES HERE</Text>
                        <EmailInputContainer>
                            <EmailInput
                                type="email"
                                placeholder="EMAIL GOES HERE"
                            />
                            <HaiButton $variant="yellowish">
                                Subscribe
                            </HaiButton>
                        </EmailInputContainer>
                    </EmailContainer>
                </Flex>
                <ElfContainer $shrink={0}>
                    <Elf
                        variant={0}
                        width="100%"
                        animated
                    />
                </ElfContainer>
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
    overflow: hidden;
    background: linear-gradient(90deg, #F2D86A 0%, #FFC3AB 100%);
    border-top: ${({ theme }) => theme.border.medium};
    z-index: 3;
`

const Inner = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'flex-start',
    $gap: 48,
    ...props
}))`
    padding: 48px;
    padding-top: 72px;
    ${({ theme }) => theme.mediaWidth.upToMedium`
        flex-direction: column;
        align-items: center;
    `}
`
const Logo = styled.img`
    width: 200px;
    height: auto;
`
const IconContainer = styled(Flex).attrs(props => ({
    $justify: 'center',
    $align: 'flex-start',
    $gap: 24,
    ...props
}))`
    & svg {
        width: 24px;
        height: auto;
        fill: black;
        stroke: none;
    }
`
const EmailContainer = styled(Flex).attrs(props => ({
    $column: true,
    $align: 'flex-start',
    $gap: 24,
    ...props
}))`
    width: 100%;
    padding: 24px;
    border-radius: 24px;
    border: ${({ theme }) => theme.border.medium};
    background-color: rgba(255,255,255,0.1);
`
const EmailInputContainer = styled(Flex)`
    width: 100%;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 999px;
    & > ${HaiButton} {
        margin: -2px;
    }
`
const EmailInput = styled.input`
    width: 100%;
    padding-left: 24px;
    background-color: rgba(255,255,255,0.1);
    outline: none;
    border: none;

    &::placeholder {
        color: black;
        font-weight: 700;
    }
`
const ElfContainer = styled(CenteredFlex)`
    position: relative;
    width: 100%;
    max-width: 280px;
    align-self: flex-end;
    flex-shrink: 1;
    & > * {
        left: 48px;
        bottom: -120px;
        transform: rotate(-10deg);
    }
    ${({ theme }) => theme.mediaWidth.upToSmall`
        max-width: 40vw;
        left: auto;
        right: -10vw;
        z-index: 0;
    `}
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