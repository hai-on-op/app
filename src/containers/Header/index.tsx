import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { LINK_TO_DOCS, LINK_TO_TELEGRAM, LINK_TO_TWITTER, formatNumberWithStyle } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useMediaQuery } from '~/hooks'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Title } from '~/styles'
import { Twitter } from '~/components/Icons/Twitter'
import { Telegram } from '~/components/Icons/Telegram'
import { Sound } from '~/components/Icons/Sound'
import { HaiFace } from '~/components/Icons/HaiFace'
import { Marquee, MarqueeChunk } from '~/components/Marquee'
import { InternalLink } from '~/components/InternalLink'
import { ExternalLink } from '~/components/ExternalLink'
import { ConnectButton } from '~/components/ConnectButton'
import { BrandedDropdown, DropdownOption } from '~/components/BrandedDropdown'
import { WrapETHModal } from '~/components/Modal/WrapETHModal'
// import { Notifications } from './Notifications'
import { MobileMenu } from './MobileMenu'

import haiLogo from '~/assets/logo.png'

type HeaderProps = {
    tickerActive?: boolean,
}
export function Header({ tickerActive = false }: HeaderProps) {
    const location = useLocation()
    const isSplash = location.pathname === '/'

    const isLargerThanExtraSmall = useMediaQuery('upToExtraSmall')
    const isLargerThanSmall = useMediaQuery('upToSmall')
    const isLargerThanMedium = useMediaQuery('upToMedium')
    const isLargerThanLarge = useMediaQuery('upToLarge')

    const {
        vaultModel: { liquidationData },
        settingsModel: {
            headerBgActive,
            isPlayingMusic,
        },
    } = useStoreState(state => state)
    const { setIsPlayingMusic } = useStoreActions(actions => actions.settingsModel)

    const { data: { marketPrice, redemptionPrice } } = useAnalytics()

    const [dropdownActive, setDropdownActive] = useState(false)
    // const [notificationsActive, setNotificationsActive] = useState(false)

    const [wrapEthActive, setWrapEthActive] = useState(false)

    const tickerText = useMemo(() => {
        // TODO: figure out %change (or drop it)
        const arr = [
            [
                'HAI (MP)',
                marketPrice.formatted,
                '↑34%',
                '\u2022',
            ],
            [
                'HAI (RP)',
                redemptionPrice.formatted,
                '↑34%',
                '\u2022',
            ],
        ]
        if (liquidationData) {
            Object.entries(liquidationData.collateralLiquidationData)
                .forEach(([token, data]) => {
                    if (!data?.currentPrice.value) return
                    arr.push([
                        token,
                        formatNumberWithStyle(data.currentPrice.value, {
                            style: 'currency',
                            maxDecimals: 3,
                        }),
                        '↑34%',
                        '\u2022',
                    ])
                })
        }
        return arr.flat()
    }, [liquidationData, marketPrice, redemptionPrice])

    return (<>
        {wrapEthActive && <WrapETHModal onClose={() => setWrapEthActive(false)}/>}
        <Container
            $tickerActive={tickerActive}
            $withBg={!isSplash || headerBgActive}>
            {tickerActive && (
                <Ticker>
                    <Marquee text={tickerText}/>
                </Ticker>
            )}
            <Inner $blur={!isSplash || headerBgActive}>
                <CenteredFlex $gap={
                    isLargerThanLarge
                        ? 48
                        : isLargerThanSmall
                            ? 36
                            : 24
                }>
                    {isLargerThanExtraSmall
                        ? (
                            <Logo
                                src={haiLogo}
                                alt="HAI"
                                width={701}
                                height={264}
                            />
                        )
                        : (
                            <HaiFace
                                filled
                                size={56}
                            />
                        )
                    }
                    {isLargerThanSmall && (
                        isSplash
                            ? (<>
                                {/* TODO: replace links */}
                                <ExternalLink
                                    href={LINK_TO_DOCS}
                                    $textDecoration="none">
                                    <HeaderLink>Learn</HeaderLink>
                                </ExternalLink>
                                <ExternalLink
                                    href={LINK_TO_DOCS}
                                    $textDecoration="none">
                                    <HeaderLink>Docs</HeaderLink>
                                </ExternalLink>
                                <ExternalLink
                                    href={LINK_TO_DOCS}
                                    $textDecoration="none">
                                    <HeaderLink>Community</HeaderLink>
                                </ExternalLink>
                            </>)
                            : isLargerThanMedium && (<>
                                <InternalLink
                                    href="/vaults"
                                    $textDecoration="none"
                                    content={(
                                        <HeaderLink $active={location.pathname.startsWith('/vaults')}>
                                            GET HAI
                                        </HeaderLink>
                                    )}
                                />
                                <InternalLink
                                    href="/earn"
                                    $textDecoration="none"
                                    content={(
                                        <HeaderLink $active={location.pathname === '/earn'}>
                                            EARN
                                        </HeaderLink>
                                    )}
                                />
                                {isLargerThanLarge && (
                                    <InternalLink
                                        href="/learn"
                                        $textDecoration="none"
                                        content={(
                                            <HeaderLink $active={location.pathname === '/learn'}>
                                                LEARN
                                            </HeaderLink>
                                        )}
                                    />
                                )}
                            </>)
                    )}
                </CenteredFlex>
                <RightSide>
                    {isLargerThanSmall && (
                        isSplash
                            ? (<>
                                <ExternalLink
                                    href={LINK_TO_TWITTER}
                                    $textDecoration="none">
                                    <Twitter size={28}/>
                                </ExternalLink>
                                <ExternalLink
                                    href={LINK_TO_TELEGRAM}
                                    $textDecoration="none">
                                    <Telegram size={32}/>
                                </ExternalLink>
                            </>)
                            : (
                                <BrandedDropdown
                                    width="200px"
                                    label={!isLargerThanMedium ? 'Menu': 'More'}>
                                    {!isLargerThanMedium && (<>
                                        <InternalLink
                                            href="/vaults"
                                            $textDecoration="none">
                                            <DropdownOption $active={location.pathname.startsWith('/vaults')}>
                                                Get HAI
                                            </DropdownOption>
                                        </InternalLink>
                                        <InternalLink
                                            href="/earn"
                                            $textDecoration="none">
                                            <DropdownOption $active={location.pathname === '/earn'}>
                                                Earn
                                            </DropdownOption>
                                        </InternalLink>
                                    </>)}
                                    {!isLargerThanLarge && (
                                        <InternalLink
                                            href="/learn"
                                            $textDecoration="none">
                                            <DropdownOption $active={location.pathname === '/learn'}>
                                                Learn
                                            </DropdownOption>
                                        </InternalLink>
                                    )}
                                    <InternalLink
                                        href="/auctions"
                                        $textDecoration="none">
                                        <DropdownOption $active={location.pathname === '/auctions'}>
                                            Auctions
                                        </DropdownOption>
                                    </InternalLink>
                                    <InternalLink
                                        href="/analytics"
                                        $textDecoration="none">
                                        <DropdownOption $active={location.pathname === '/analytics'}>
                                            Analytics
                                        </DropdownOption>
                                    </InternalLink>
                                    <InternalLink
                                        href="/contracts"
                                        $textDecoration="none">
                                        <DropdownOption $active={location.pathname === '/contracts'}>
                                            Contracts
                                        </DropdownOption>
                                    </InternalLink>
                                    <InternalLink
                                        href="/vaults/explore"
                                        $textDecoration="none">
                                        <DropdownOption $active={location.pathname === '/vaults/explore'}>
                                            Vault Explorer
                                        </DropdownOption>
                                    </InternalLink>
                                    <DropdownOption onClick={() => {
                                        setDropdownActive(false)
                                        setWrapEthActive(true)
                                    }}>
                                        Wrap ETH
                                    </DropdownOption>
                                </BrandedDropdown>
                            )
                    )}
                    <MusicButton onClick={() => setIsPlayingMusic(!isPlayingMusic)}>
                        <Sound
                            muted={!isPlayingMusic}
                            size={21}
                        />
                    </MusicButton>
                    {isSplash
                        ? (
                            <InternalLink
                                href="/vaults"
                                $textDecoration="none">
                                <HaiButton $variant="yellowish">
                                    Enter App
                                </HaiButton>
                            </InternalLink>
                        )
                        : (<>
                            {isLargerThanSmall && <ConnectButton showBalance/>}
                            {/* <Notifications
                                active={notificationsActive}
                                setActive={setNotificationsActive}
                            /> */}
                        </>)
                    }
                    {!isLargerThanSmall && (
                        <MobileMenu
                            active={dropdownActive}
                            setActive={setDropdownActive}
                            showWrapEth={() => setWrapEthActive(true)}
                        />
                    )}
                </RightSide>
            </Inner>
        </Container>
    </>)
}

const Container = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'space-between',
    $align: 'stretch',
    ...props,
}))<{ $tickerActive: boolean, $withBg?: boolean }>`
    position: fixed;
    top: 0px;
    left: 0px;
    right: 0px;
    height: ${({ $tickerActive }) => $tickerActive ? 156: 96}px;

    ${({ $withBg }) => !!$withBg && css`
        &::before {
            content: '';
            position: absolute;
            inset: 0px;
            background-color: rgba(255,255,255,0.3);
            z-index: -1;
        }
    `}

    ${({ theme, $tickerActive }) => theme.mediaWidth.upToSmall`
        height: ${$tickerActive ? 140: 80}px;
    `}
    ${({ theme, $tickerActive }) => theme.mediaWidth.upToExtraSmall`
        height: ${$tickerActive ? 120: 60}px;
    `}

    z-index: 2;
`

const Ticker = styled(Flex)`
    width: 100%;
    height: 60px;
    background: ${({ theme }) => theme.colors.gradient};
    border-bottom: ${({ theme }) => theme.border.medium};

    & ${MarqueeChunk} {
        & > *:nth-child(4n + 1) {
            font-weight: 700;
        }
    }
`
const Inner = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 24,
    ...props,
}))<{ $blur?: boolean }>`
    height: 100%;
    padding: 0 42px;
    backdrop-filter: ${({ $blur = false }) => $blur ? 'blur(13px)': 'none'};
    border-bottom: 2px solid ${({ $blur = false }) => $blur ? 'black': 'transparent'};

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 0 24px;
    `}
`

const Logo = styled.img`
    width: auto;
    height: 60px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        height: 40px;
    `}
`

const HeaderLink = styled(Title).attrs(props => ({
    $fontSize: '1.6em',
    $letterSpacing: '0.2rem',
    $textTransform: 'uppercase',
    $whiteSpace: 'nowrap',
    ...props,
}))<{ $active?: boolean }>`
    text-shadow: none;
    -webkit-text-stroke: 0px;
    font-weight: ${({ $active = false }) => $active ? 700: 400};
`

const RightSide = styled(CenteredFlex)`
    gap: 36px;

    ${({ theme }) => theme.mediaWidth.upToMedium`
        gap: 24px;
    `}
    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        gap: 12px;
    `}
`

const MusicButton = styled(HaiButton)`
    width: 48px;
    min-width: unset;
    height: 48px;
    padding: 0px;
    justify-content: center;
`
