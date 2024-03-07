import { LINK_TO_DISCORD, LINK_TO_DOCS, LINK_TO_PRIVACY_POLICY, LINK_TO_TELEGRAM, LINK_TO_TWITTER } from '~/utils'
import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, Text } from '~/styles'
import { Elf } from '~/components/BrandElements/Elf'
import { Twitter } from '~/components/Icons/Twitter'
import { Telegram } from '~/components/Icons/Telegram'
import { Discord } from '~/components/Icons/Discord'
import { Link } from '~/components/Link'
import { ArrowUp } from 'react-feather'

import haiLogo from '~/assets/logo.png'

export function Footer() {
    const isUpToMedium = useMediaQuery('upToMedium')

    return (
        <Container as="footer">
            <ScrollButton
                $variant="yellowish"
                onClick={() => {
                    const zoomEl = document.getElementById('zoom-scroll-container')
                    if (!zoomEl) return
                    zoomEl.scrollTop = 3 * window.innerHeight
                }}
            >
                <ArrowUp />
            </ScrollButton>
            <Inner>
                <Description>
                    <Logo src={haiLogo} width={701} height={264} alt="HAI" />
                    <Text $fontSize="0.8em" $fontWeight={700}>
                        HAI is a multi-collateral, over-collateralized CDP-minted stablecoin, using a PID controller to
                        induce stability.
                    </Text>
                    <Text $fontSize="0.8em">
                        {`HAI adopts a mechanism familiar to stablecoin protocols; it is minted from over-collateralized debt positions (CDPs). In essence, every HAI token in circulation corresponds to a greater amount of collateral locked by individual protocol users, also known as minters. These minters can generate or annihilate HAI, depending on their collateral's value. This approach aligns with systems employed by other cryptocurrencies like DAI, RAI, and many others.`}
                    </Text>
                </Description>
                <LinksContainer>
                    <Grid $columns="1fr 1fr min-content" $gap={12}>
                        <Flex $column $gap={12}>
                            <Text $fontWeight={700}>About</Text>
                            <Link href={LINK_TO_PRIVACY_POLICY} $textDecoration="none">
                                Privacy
                            </Link>
                            {/* <Link
                                href="/terms"
                                $textDecoration="none">
                                Terms
                            </Link> */}
                        </Flex>
                        <Flex $column $gap={12}>
                            <Text $fontWeight={700}>Resources</Text>
                            <Link href={`${LINK_TO_DOCS}detailed/intro/hai.html`} $textDecoration="none">
                                Docs
                            </Link>
                        </Flex>
                        <IconContainer>
                            <Link href={LINK_TO_TWITTER} $textDecoration="none" aria-label="Twitter">
                                <Twitter size={28} />
                            </Link>
                            <Link href={LINK_TO_TELEGRAM} $textDecoration="none" aria-label="Telegram">
                                <Telegram size={32} />
                            </Link>
                            <Link href={LINK_TO_DISCORD} $textDecoration="none" aria-label="Discord">
                                <Discord size={32} />
                            </Link>
                        </IconContainer>
                    </Grid>
                </LinksContainer>
                <ElfContainer $shrink={0}>
                    <Elf variant={5} width="100%" animated />
                </ElfContainer>
                {isUpToMedium && <Bottom>© 2024 HAI</Bottom>}
            </Inner>
            {!isUpToMedium && <Bottom>© 2024 HAI</Bottom>}
        </Container>
    )
}

const Container = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'stretch',
    $align: 'stretch',
    ...props,
}))`
    position: relative;
    overflow: hidden;
    margin-top: 80vh;
    scroll-snap-align: end;
    background: ${({ theme }) => theme.colors.gradient};

    ${({ theme }) => theme.mediaWidth.upToMedium`
        padding-top: 60px;
        background: transparent;
    `}
    ${({ theme }) => theme.mediaWidth.upToSmall`
        pointer-events: none;
    `}

    z-index: 3;
`
const ScrollButton = styled(HaiButton)`
    display: none;
    position: absolute;
    right: 12px;
    top: 0px;
    width: 48px;
    min-width: 48px;
    height: 48px;
    justify-content: center;
    padding: 0px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        display: flex;
    `}

    pointer-events: all;
`

const Inner = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'flex-start',
    $gap: 48,
    ...props,
}))`
    background: transparent;
    border-top: ${({ theme }) => theme.border.medium};
    padding: 48px;
    padding-top: 60px;
    ${({ theme }) => theme.mediaWidth.upToMedium`
        background: ${({ theme }) => theme.colors.gradient};
        flex-direction: column;
        align-items: center;
        padding-bottom: 0px;
    `}
    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 36px 24px;
        padding-bottom: 0px;
        gap: 24px;
    `}
`
const Description = styled(Grid).attrs((props) => ({
    $columns: '1fr',
    $align: 'flex-start',
    $gap: 24,
    ...props,
}))`
    max-width: 520px;

    ${({ theme }) => theme.mediaWidth.upToMedium`
        max-width: 480px;
    `}
    ${({ theme }) => theme.mediaWidth.upToSmall`
        max-width: 100%;
        font-size: 0.8rem;
    `}
    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        grid-template-columns: min-content 1fr;
        & > *:last-child {
            grid-column: 1 / -1;
        }
    `}
`
const Logo = styled.img`
    width: 200px;
    height: auto;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        width: 160px;
    `}
    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        width: min(100px, 25vw);
    `}
`

const LinksContainer = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'space-between',
    $align: 'stretch',
    $gap: 48,
    ...props,
}))`
    max-width: min(calc(100vw - 48px), 400px);

    & a {
        pointer-events: all;
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        max-width: 100%;
        gap: 24px;
        & > ${Grid} {
            width: fit-content;
            grid-gap: 48px;
        }
    `}
`
const IconContainer = styled(Flex).attrs((props) => ({
    $justify: 'center',
    $align: 'flex-start',
    $gap: 24,
    ...props,
}))`
    & svg {
        height: 24px;
        width: auto;
        fill: black;
        stroke: none;
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column;
        align-items: center;
        & svg {
            width: 24px;
            height: auto;
        }
    `}
`

const ElfContainer = styled(CenteredFlex)`
    position: relative;
    width: 100%;
    max-width: 280px;
    align-self: flex-end;
    flex-shrink: 1;
    margin-left: -100px;
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
        margin-top: -24px;
    `}
`

const Bottom = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'flex-start',
    $align: 'center',
    ...props,
}))`
    padding: 24px 48px;
    border-top: ${({ theme }) => theme.border.thin};
    font-size: 0.8rem;

    ${({ theme }) => theme.mediaWidth.upToMedium`
        width: calc(100% + 96px);
    `}
    ${({ theme }) => theme.mediaWidth.upToSmall`
        width: calc(100% + 48px);
    `}
    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        padding: 12px;
    `}
`
