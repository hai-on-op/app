import { useState } from 'react'

import { useMediaQuery, useOutsideClick } from '~/hooks'
import { useStoreActions, useStoreState } from '~/store'

import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Title } from '~/styles'
import Twitter from '~/components/Icons/Twitter'
import Telegram from '~/components/Icons/Telegram'
import Sound from '~/components/Icons/Sound'

import haiLogo from '~/assets/logo.png'

export function Header() {
    const isLargerThanSmall = useMediaQuery('upToSmall')

    const { isPlayingMusic } = useStoreState(state => state.settingsModel)
    const { setIsPlayingMusic } = useStoreActions(actions => actions.settingsModel)

    const [dropdownButton, setDropdownButton] = useState<HTMLElement>()
    const [dropdownActive, setDropdownActive] = useState(false)
    useOutsideClick(dropdownButton, () => setDropdownActive(false))

    return (
        <Container>
            <CenteredFlex $gap={isLargerThanSmall ? 48: 24}>
                <Logo
                    src={haiLogo}
                    alt="HAI"
                    width={701}
                    height={264}
                />
                {isLargerThanSmall && (<>
                    <HeaderLink $fontWeight={900}>Learn</HeaderLink>
                    <HeaderLink $fontWeight={400}>Docs</HeaderLink>
                    <HeaderLink $fontWeight={400}>Community</HeaderLink>
                </>)}
            </CenteredFlex>
            <RightSide $gap={isLargerThanSmall ? 36: 24}>
                {isLargerThanSmall && (<>
                    <Twitter/>
                    <Telegram/>
                </>)}
                <MusicButton
                    $variant="unblurred"
                    onClick={() => setIsPlayingMusic(!isPlayingMusic)}>
                    <Sound muted={!isPlayingMusic}/>
                </MusicButton>
                <HaiButton
                    $variant="yellowish"
                    $shrink={1}>
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
                                <HeaderLink>Learn</HeaderLink>
                                <HeaderLink>Docs</HeaderLink>
                                <HeaderLink>Connect</HeaderLink>
                                <HeaderLink>Twitter</HeaderLink>
                                <HeaderLink>Telegram</HeaderLink>
                            </DropdownContainer>
                        )}
                    </DropdownButton>
                )}
            </RightSide>
        </Container>
    )
}

const Container = styled(Flex).attrs(props => ({
    $justify: 'space-between',
    $align: 'center',
    $gap: 24,
    ...props
}))`
    justify-content: space-between;
    position: fixed;
    top: 0px;
    left: 0px;
    right: 0px;
    height: 120px;
    padding: 42px;

    & svg {
        stroke: black;
        stroke-width: 1.5px;
        width: auto;
        height: 24px;
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 24px;
        height: 96px;
    `}

    z-index: 2;
`
const Logo = styled.img`
    width: auto;
    height: 60px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        height: 40px;
    `}
`

const HeaderLink = styled(Title).attrs(props => ({
    $fontSize: '1.6rem',
    $letterSpacing: '0.2rem',
    $textTransform: 'uppercase',
    ...props
}))``

const RightSide = styled(CenteredFlex)`
    & svg {
        fill: black;
        stroke: none;
    }
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
    & > * {
        padding: 4px 16px;
    }
`