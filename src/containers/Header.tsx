import { useState } from 'react'

import { LINK_TO_DOCS, LINK_TO_TELEGRAM, LINK_TO_TWITTER } from '~/utils'
import { useMediaQuery, useOutsideClick } from '~/hooks'
import { useStoreActions, useStoreState } from '~/store'

import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Title } from '~/styles'
import Twitter from '~/components/Icons/Twitter'
import Telegram from '~/components/Icons/Telegram'
import Sound from '~/components/Icons/Sound'
import HaiFace from '~/components/Icons/HaiFace'
import { Marquee, MarqueeChunk } from '~/components/Marquee'
import { ExternalLink } from '~/components/ExternalLink'

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
    const isLargerThanExtraSmall = useMediaQuery('upToExtraSmall')
    const isLargerThanSmall = useMediaQuery('upToSmall')

    const { isPlayingMusic } = useStoreState(state => state.settingsModel)
    const { setIsPlayingMusic } = useStoreActions(actions => actions.settingsModel)

    const [dropdownButton, setDropdownButton] = useState<HTMLElement>()
    const [dropdownActive, setDropdownActive] = useState(false)
    useOutsideClick(dropdownButton, () => setDropdownActive(false))

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
                    {isLargerThanSmall && (<>
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
                    </>)}
                </CenteredFlex>
                <RightSide>
                    {isLargerThanSmall && (<>
                        <ExternalLink
                            href={LINK_TO_TWITTER}
                            $textDecoration="none">
                            <Twitter
                                width={28}
                                height={24}
                            />
                        </ExternalLink>
                        <ExternalLink
                            href={LINK_TO_TELEGRAM}
                            $textDecoration="none">
                            <Telegram
                                width={32}
                                height={24}
                            />
                        </ExternalLink>
                    </>)}
                    <MusicButton
                        $variant="unblurred"
                        onClick={() => setIsPlayingMusic(!isPlayingMusic)}>
                        <Sound muted={!isPlayingMusic}/>
                    </MusicButton>
                    <HaiButton $variant="yellowish">
                        Coming Soon
                    </HaiButton>
                    {!isLargerThanSmall && (
                        <DropdownButton
                            $variant="yellowish"
                            ref={setDropdownButton as any}
                            onClick={() => setDropdownActive(a => !a)}>
                            <svg viewBox="0 0 10 8" width="10" height="8">
                                <line x1="1" y1="1" x2="9" y2="1"/>
                                <line x1="1" y1="4" x2="9" y2="4"/>
                                <line x1="1" y1="7" x2="9" y2="7"/>
                            </svg>
                            {dropdownActive && (
                                <DropdownContainer onClick={(e: any) => e.stopPropagation()}>
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
                                </DropdownContainer>
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

    & svg {
        width: 64px;
        height: auto;
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 24px;
    `}
    ${({ theme, $tickerActive }) => theme.mediaWidth.upToExtraSmall`
        padding: 12px;
        height: ${$tickerActive ? 140: 80}px;
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
    $fontWeight: 400,
    ...props
}))``

const RightSide = styled(CenteredFlex)`
    gap: 36px;

    & svg {
        fill: black;
        stroke: none;
        width: auto;
        height: 24px;
    }

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
    & svg {
        width: 25px;
        margin-left: -2px;
    }
`

const DropdownButton = styled(HaiButton)`
    position: relative;
    width: 48px;
    min-width: unset;
    height: 48px;
    padding: 0px;
    justify-content: center;

    & > svg {
        width: 20px;
        height: auto;
        fill: none;
        stroke: black;
        stroke-width: 1.5px;
        stroke-linecap: round;
    }
`
const DropdownContainer = styled(Flex).attrs(props => ({
    $column: true,
    $align: 'flex-start',
    ...props
}))`
    position: absolute;
    top: calc(100% + 20px);
    right: 0px;
    width: 280px;
    padding: 12px 0;
    background-color: ${({ theme }) => theme.colors.yellowish};
    box-shadow: 0 3px 17px rgba(0,0,0,0.3);
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;
    font-size: 0.8em;

    & > * {
        padding: 4px 16px;
    }
`