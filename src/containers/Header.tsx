import { useState } from 'react'
import { useLocation } from 'react-router-dom'

import { LINK_TO_DOCS, LINK_TO_TELEGRAM, LINK_TO_TWITTER } from '~/utils'
import { useMediaQuery, useOutsideClick } from '~/hooks'
import { useStoreActions, useStoreState } from '~/store'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Popout, Text, Title } from '~/styles'
import { Twitter } from '~/components/Icons/Twitter'
import { Telegram } from '~/components/Icons/Telegram'
import { Sound } from '~/components/Icons/Sound'
import { HaiFace } from '~/components/Icons/HaiFace'
import { Notification } from '~/components/Icons/Notification'
import { Hamburger } from '~/components/Icons/Hamburger'
import { Gear } from '~/components/Icons/Gear'
import { Marquee, MarqueeChunk } from '~/components/Marquee'
import { PassLink } from '~/components/PassLink'
import { ExternalLink } from '~/components/ExternalLink'
import { ConnectButton } from '~/components/ConnectButton'
import { BrandedDropdown, DropdownOption } from '~/components/BrandedDropdown'

import haiLogo from '~/assets/logo.png'

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

    const [dropdownButton, setDropdownButton] = useState<HTMLElement>()
    const [dropdownActive, setDropdownActive] = useState(false)
    useOutsideClick(dropdownButton, () => setDropdownActive(false))

    const [notificationButton, setNotificationButton] = useState<HTMLElement>()
    const [notificationsActive, setNotificationsActive] = useState(false)
    useOutsideClick(notificationButton, () => setNotificationsActive(false))

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
                            <NotificationButton
                                as="div"
                                ref={setNotificationButton as any}
                                onClick={() => setNotificationsActive(a => !a)}
                                $variant="yellowish"
                                $notify>
                                <Notification size={18}/>
                                {notificationsActive && (
                                    <NotificationsDropdown
                                        $float="left"
                                        $margin="20px"
                                        onClick={(e: any) => e.stopPropagation()}>
                                        <Flex
                                            $width="100%"
                                            $justify="space-between"
                                            $align="center">
                                            <Text>Notifications</Text>
                                            <SettingsButton>
                                                <Gear size={22}/>
                                            </SettingsButton>
                                        </Flex>
                                        <CenteredFlex $width="100%">
                                            <Text
                                                $fontWeight={700}
                                                $textDecoration="underline">
                                                View All Notifications
                                            </Text>
                                        </CenteredFlex>
                                    </NotificationsDropdown>
                                )}
                            </NotificationButton>
                        </>)
                    }
                    {!isLargerThanSmall && (
                        <DropdownButton
                            $variant="yellowish"
                            ref={setDropdownButton as any}
                            onClick={() => setDropdownActive(a => !a)}>
                            <Hamburger size={20}/>
                            {dropdownActive && (
                                <Dropdown
                                    $float="left"
                                    $margin="20px"
                                    onClick={(e: any) => e.stopPropagation()}>
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

                                    <HeaderLink>Connect</HeaderLink>

                                    <ExternalLink
                                        href={LINK_TO_TWITTER}
                                        $textDecoration="none">
                                        <HeaderLink>Twitter</HeaderLink>
                                    </ExternalLink>
                                    <ExternalLink
                                        href={LINK_TO_TELEGRAM}
                                        $textDecoration="none">
                                        <HeaderLink>Telegram</HeaderLink>
                                    </ExternalLink>
                                </Dropdown>
                            )}
                        </DropdownButton>
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
const SettingsButton = styled(MusicButton)``
const NotificationButton = styled(HaiButton)<{ $notify?: boolean }>`
    position: relative;
    width: 48px;
    height: 48px;
    padding: 0px;
    justify-content: center;

    ${({ $notify = false }) => $notify && css`
        &::after {
            content: '';
            position: absolute;
            top: -10px;
            right: -10px;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background-color: ${({ theme }) => theme.colors.reddish};
            border: ${({ theme }) => theme.border.medium};
        }
    `}
`
const NotificationsDropdown = styled(Popout)`
    width: min(400px, calc(100vw - 48px));
    padding: 24px;
    margin-right: -21px;
    gap: 24px;
    cursor: default;
`

const DropdownButton = styled(HaiButton)`
    position: relative;
    width: 48px;
    min-width: unset;
    height: 48px;
    padding: 0px;
    justify-content: center;
`
const Dropdown = styled(Popout)`
    width: 280px;
    padding: 12px;
    margin-right: -19px;
    gap: 4px;
    cursor: default;
    
    & > * {
        width: 100%;
        height: 36px;
        & * {
            line-height: 36px;
        }
        border-radius: 12px;
        border: 1px solid rgba(0,0,0,0.1);
    }
`