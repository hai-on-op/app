import { useState } from 'react'
import { useLocation } from 'react-router-dom'

import { LINK_TO_DOCS, LINK_TO_TELEGRAM, LINK_TO_TWITTER } from '~/utils'
import { useMediaQuery } from '~/hooks'
import { useStoreActions, useStoreState } from '~/store'

import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Title } from '~/styles'
import { Twitter } from '~/components/Icons/Twitter'
import { Telegram } from '~/components/Icons/Telegram'
import { Sound } from '~/components/Icons/Sound'
import { HaiFace } from '~/components/Icons/HaiFace'
import { Marquee, MarqueeChunk } from '~/components/Marquee'
import { PassLink } from '~/components/PassLink'
import { ExternalLink } from '~/components/ExternalLink'
import { ConnectButton } from '~/components/ConnectButton'
import { BrandedDropdown, DropdownOption } from '~/components/BrandedDropdown'
import { Notifications } from './Notifications'
import { MobileMenu } from './MobileMenu'

import haiLogo from '~/assets/logo.png'

// TODO: actually create ticker data
const tickerExampleText = [
    'HAI',
    '$1.50',
    '↑34%',
    '\u2022'
]

type HeaderProps = {
    tickerActive?: boolean
}
export function Header({ tickerActive = false }: HeaderProps) {
    const location = useLocation()
    const isSplash = location.pathname === '/'

    const isLargerThanExtraSmall = useMediaQuery('upToExtraSmall')
    const isLargerThanSmall = useMediaQuery('upToSmall')

    const { isPlayingMusic } = useStoreState(state => state.settingsModel)
    const { setIsPlayingMusic } = useStoreActions(actions => actions.settingsModel)

    const [dropdownActive, setDropdownActive] = useState(false)
    const [notificationsActive, setNotificationsActive] = useState(false)

    return (
        <Container $tickerActive={tickerActive}>
            {tickerActive && (
                <Ticker>
                    <Marquee text={tickerExampleText}/>
                </Ticker>
            )}
            <Inner>
                <CenteredFlex $gap={isLargerThanSmall ? 48: 24}>
                    {isLargerThanExtraSmall
                        ? (
                            <Logo
                                src={haiLogo}
                                alt="HAI"
                                width={701}
                                height={264}
                            />
                        )
                        : <HaiFace filled/>
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
                            : (<>
                                <PassLink
                                    href="/vaults"
                                    $textDecoration="none"
                                    content={(
                                        <HeaderLink $active={location.pathname === '/vaults'}>
                                            GET HAI
                                        </HeaderLink>
                                    )}
                                />
                                <PassLink
                                    href="/earn"
                                    $textDecoration="none"
                                    content={(
                                        <HeaderLink $active={location.pathname === '/earn'}>
                                            EARN
                                        </HeaderLink>
                                    )}
                                />
                                <ExternalLink
                                    href={LINK_TO_DOCS}
                                    $textDecoration="none">
                                    <HeaderLink>LEARN</HeaderLink>
                                </ExternalLink>
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
                                <BrandedDropdown label="More">
                                    <PassLink
                                        href="/auctions"
                                        $textDecoration="none">
                                        <DropdownOption>
                                            Auctions
                                        </DropdownOption>
                                    </PassLink>
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
                            <PassLink
                                href="/vaults"
                                $textDecoration="none">
                                <HaiButton $variant="yellowish">
                                    Enter App
                                </HaiButton>
                            </PassLink>
                        )
                        : (<>
                            <ConnectButton showBalance/>
                            <Notifications
                                active={notificationsActive}
                                setActive={setNotificationsActive}
                            />
                        </>)
                    }
                    {!isLargerThanSmall && (
                        <MobileMenu
                            active={dropdownActive}
                            setActive={setDropdownActive}
                        />
                    )}
                </RightSide>
            </Inner>
        </Container>
    )
}

const Container = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'space-between',
    $align: 'stretch',
    ...props
}))<{ $tickerActive: boolean }>`
    position: fixed;
    top: 0px;
    left: 0px;
    right: 0px;
    height: ${({ $tickerActive }) => $tickerActive ? 156: 96}px;

    ${({ theme, $tickerActive }) => theme.mediaWidth.upToSmall`
        height: ${$tickerActive ? 140: 80}px;
    `}
    ${({ theme, $tickerActive }) => theme.mediaWidth.upToExtraSmall`
        height: ${$tickerActive ? 120: 60}px;
        gap: 12px;
    `}

    z-index: 2;
`

const Ticker = styled(Flex)`
    width: 100%;
    height: 60px;
    background: ${({ theme }) => theme.colors.gradient};
    border-bottom: ${({ theme }) => theme.border.medium};

    & ${MarqueeChunk} {
        & > *:first-child {
            font-weight: 700;
        }
    }
`
const Inner = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 24,
    ...props
}))`
    height: 100%;
    padding: 0 42px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 0 24px;
    `}
    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        padding: 0 12px;
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
    ...props
}))<{ $active?: boolean }>`
    text-shadow: none;
    -webkit-text-stroke: 0px;
    font-weight: ${({ $active = false }) => $active ? 700: 400};
`

const RightSide = styled(CenteredFlex)`
    gap: 36px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
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
