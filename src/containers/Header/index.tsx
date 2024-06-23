import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAccount } from 'wagmi'

import {
    LINK_TO_DISCORD,
    LINK_TO_FORUM,
    LINK_TO_DOCS,
    LINK_TO_TELEGRAM,
    LINK_TO_TWITTER,
    formatDataNumber,
} from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useMediaQuery, useOutsideClick } from '~/hooks'
import { formatCollateralLabel } from '~/utils'
import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Popout, Title } from '~/styles'
import { Twitter } from '~/components/Icons/Twitter'
import { Telegram } from '~/components/Icons/Telegram'
import { Discord } from '~/components/Icons/Discord'
import { Send } from 'react-feather'
import { Marquee, MarqueeChunk } from '~/components/Marquee'
import { Link } from '~/components/Link'
import { ConnectButton } from '~/components/ConnectButton'
import { BrandedDropdown } from '~/components/BrandedDropdown'
import { WrapETHModal } from '~/components/Modal/WrapETHModal'
// import { Notifications } from './Notifications'
import { HaiFace } from '~/components/Icons/HaiFace'
import { MobileMenu } from './MobileMenu'
import { MusicButton } from './MusicButton'

import haiLogo from '~/assets/logo.png'

type HeaderProps = {
    tickerActive?: boolean
}
export function Header({ tickerActive = false }: HeaderProps) {
    const location = useLocation()
    const isSplash = location.pathname === '/'

    const isUpToExtraSmall = useMediaQuery('upToExtraSmall')
    const isUpToSmall = useMediaQuery('upToSmall')
    const isUpToMedium = useMediaQuery('upToMedium')
    const isUpToLarge = useMediaQuery('upToLarge')

    const { isConnected } = useAccount()

    const {
        settingsModel: { headerBgActive },
    } = useStoreState((state) => state)
    const {
        popupsModel: { toggleModal },
    } = useStoreActions((actions) => actions)

    const {
        data: { redemptionPrice, tokenAnalyticsData },
        haiMarketPrice,
    } = useAnalytics()

    const [dropdownActive, setDropdownActive] = useState(false)
    // const [notificationsActive, setNotificationsActive] = useState(false)
    const [communityContainer, setCommunityContainer] = useState<HTMLElement | null>(null)
    const [communityDropdownActive, setCommunityDropdownActive] = useState(false)
    useOutsideClick(communityContainer, () => setCommunityDropdownActive(false))

    const [wrapEthActive, setWrapEthActive] = useState(false)
    useEffect(() => {
        toggleModal({
            modal: 'wrapETH',
            isOpen: wrapEthActive,
        })
    }, [wrapEthActive, toggleModal])

    const tickerText = useMemo(() => {
        const arr = [
            ['HAI (MP)', haiMarketPrice.formatted, '\u2022'],
            ['HAI (RP)', redemptionPrice.formatted, '\u2022'],
        ]
        tokenAnalyticsData.forEach(({ symbol, currentPrice }) => {
            const price = formatDataNumber(currentPrice.toString() || '0', 18, 2, true)
            arr.push([formatCollateralLabel(symbol), price, '\u2022'])
        })
        return arr.flat()
    }, [tokenAnalyticsData, haiMarketPrice.formatted, redemptionPrice])

    const logoEl = useMemo(
        () =>
            isUpToExtraSmall ? <HaiFace filled size={56} /> : <Logo src={haiLogo} alt="HAI" width={701} height={264} />,
        [isUpToExtraSmall]
    )

    return (
        <>
            {wrapEthActive && <WrapETHModal onClose={() => setWrapEthActive(false)} />}
            <Container $tickerActive={tickerActive} $withBg={!isSplash || headerBgActive}>
                {tickerActive && (
                    <Ticker>
                        <Marquee text={tickerText} />
                    </Ticker>
                )}
                <Inner $blur={!isSplash || headerBgActive}>
                    <LeftSide>
                        {isSplash ? (
                            <CenteredFlex
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                    const zoomEl = document.getElementById('zoom-scroll-container')
                                    if (!zoomEl) return
                                    zoomEl.scrollTop = 0
                                }}
                            >
                                {logoEl}
                            </CenteredFlex>
                        ) : (
                            <Link href="/vaults" $textDecoration="none">
                                {logoEl}
                            </Link>
                        )}
                        {!isUpToSmall &&
                            (isSplash ? (
                                <>
                                    <HeaderLink
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            const zoomEl = document.getElementById('zoom-scroll-container')
                                            if (!zoomEl) return
                                            zoomEl.scrollTop = 3 * window.innerHeight
                                        }}
                                    >
                                        Learn
                                    </HeaderLink>
                                    <Link href={`${LINK_TO_DOCS}detailed/intro/hai.html`} $textDecoration="none">
                                        <HeaderLink>Docs</HeaderLink>
                                    </Link>
                                    <CommunityDropdownContainer
                                        ref={setCommunityContainer}
                                        onClick={() => setCommunityDropdownActive((a) => !a)}
                                    >
                                        <HeaderLink>Community</HeaderLink>
                                        <CommunityDropdown
                                            $anchor="top"
                                            $float="left"
                                            $width="auto"
                                            hidden={!communityDropdownActive}
                                        >
                                            <BrandedDropdown.Item
                                                href={LINK_TO_TWITTER}
                                                icon={<Twitter size={16} stroke="black" strokeWidth={2} />}
                                            >
                                                Twitter
                                            </BrandedDropdown.Item>
                                            <BrandedDropdown.Item
                                                href={LINK_TO_TELEGRAM}
                                                icon={<Telegram size={17} stroke="black" strokeWidth={2} />}
                                            >
                                                Telegram
                                            </BrandedDropdown.Item>
                                            <BrandedDropdown.Item
                                                href={LINK_TO_DISCORD}
                                                icon={<Discord size={19} stroke="black" strokeWidth={2} />}
                                            >
                                                Discord
                                            </BrandedDropdown.Item>
                                            <BrandedDropdown.Item
                                                href={LINK_TO_FORUM}
                                                icon={<HaiFace size={19} stroke="black" strokeWidth={2} />}
                                            >
                                                Forum
                                            </BrandedDropdown.Item>
                                        </CommunityDropdown>
                                    </CommunityDropdownContainer>
                                </>
                            ) : (
                                (isConnected ? !isUpToLarge : !isUpToMedium) && (
                                    <>
                                        <Link href="/vaults" $textDecoration="none">
                                            <HeaderLink
                                                $active={
                                                    location.pathname.startsWith('/vaults') &&
                                                    !location.pathname.includes('explore')
                                                }
                                            >
                                                GET HAI
                                            </HeaderLink>
                                        </Link>
                                        <Link href="/earn" $textDecoration="none">
                                            <HeaderLink $active={location.pathname === '/earn'}>EARN</HeaderLink>
                                        </Link>
                                        <Link href="/learn" $textDecoration="none">
                                            <HeaderLink $active={location.pathname === '/learn'}>LEARN</HeaderLink>
                                        </Link>
                                    </>
                                )
                            ))}
                    </LeftSide>
                    <RightSide>
                        {!isUpToSmall && !isSplash && (
                            <MobileMenu
                                active={dropdownActive}
                                setActive={setDropdownActive}
                                showWrapEth={() => setWrapEthActive(true)}
                            />
                        )}
                        <MusicButton />
                        {isSplash ? (
                            <Link href="/vaults" $textDecoration="none">
                                <HaiButton $variant="yellowish">
                                    <Send size={18} strokeWidth={2.5} />
                                    Enter App
                                </HaiButton>
                            </Link>
                        ) : (
                            <>
                                {!isUpToSmall && <ConnectButton showBalance="horizontal" />}
                                {/* <Notifications
                                        active={notificationsActive}
                                        setActive={setNotificationsActive}
                                    /> */}
                            </>
                        )}
                        {isUpToSmall && (
                            <MobileMenu
                                active={dropdownActive}
                                setActive={setDropdownActive}
                                showWrapEth={() => setWrapEthActive(true)}
                            />
                        )}
                    </RightSide>
                </Inner>
            </Container>
        </>
    )
}

const Container = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'stretch',
    $align: 'stretch',
    $shrink: 0,
    ...props,
}))<{ $tickerActive: boolean; $withBg?: boolean }>`
    position: fixed;
    top: 0px;
    left: 0px;
    right: 0px;
    height: ${({ $tickerActive }) => ($tickerActive ? 144 : 96)}px;

    ${({ $withBg }) =>
        !!$withBg &&
        css`
            &::before {
                content: '';
                position: absolute;
                inset: 0px;
                background-color: rgba(255, 255, 255, 0.3);
                z-index: -1;
            }
        `}

    ${({ theme, $tickerActive }) => theme.mediaWidth.upToSmall`
        height: ${$tickerActive ? 132 : 84}px;
    `}
    ${({ theme, $tickerActive }) => theme.mediaWidth.upToExtraSmall`
        height: ${$tickerActive ? 120 : 72}px;
    `}

    z-index: 2;
`

const Ticker = styled(Flex)`
    width: 100%;
    height: 48px;
    background: ${({ theme }) => theme.colors.gradient};
    border-bottom: ${({ theme }) => theme.border.medium};
    flex-shrink: 0;

    & ${MarqueeChunk} {
        & > *:nth-child(3n + 1) {
            font-weight: 700;
        }
    }
`
const Inner = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 24,
    $grow: 1,
    ...props,
}))<{ $blur?: boolean }>`
    padding: 0 42px;
    backdrop-filter: ${({ $blur = false }) => ($blur ? 'blur(13px)' : 'none')};
    border-bottom: 2px solid ${({ $blur = false }) => ($blur ? 'black' : 'transparent')};

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 0 24px;
    `}
`

const LeftSide = styled(CenteredFlex)`
    gap: 48px;

    ${({ theme }) => theme.mediaWidth.upToLarge`
        gap: 36px;
    `}
    ${({ theme }) => theme.mediaWidth.upToSmall`
        gap: 24px;
    `}
`

const Logo = styled.img`
    width: auto;
    height: 60px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        height: 40px;
    `}
`

const CommunityDropdownContainer = styled(CenteredFlex)`
    position: relative;
    & > *:first-child {
        cursor: pointer;
    }
`
const CommunityDropdown = styled(Popout)`
    padding: 24px;
    gap: 12px;
    margin-top: 20px;
    z-index: 2;
    font-size: unset;
    font-weight: 700;

    text-align: left;

    & > * {
        width: 100%;
    }
    & svg {
        flex-shrink: 0;
    }
`
const HeaderLink = styled(Title).attrs((props) => ({
    $fontSize: '1.6em',
    $letterSpacing: '0.2rem',
    $textTransform: 'uppercase',
    $whiteSpace: 'nowrap',
    ...props,
}))<{ $active?: boolean }>`
    text-shadow: none;
    -webkit-text-stroke: 0px;
    font-weight: ${({ $active = false }) => ($active ? 700 : 400)};
`

const RightSide = styled(CenteredFlex)`
    gap: 36px;

    & a {
        text-decoration: none;
        width: 100%;
    }

    ${({ theme }) => theme.mediaWidth.upToMedium`
        gap: 24px;
    `}
    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        gap: 12px;
    `}
`
