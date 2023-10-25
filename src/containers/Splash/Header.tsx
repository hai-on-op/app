import { useState } from 'react'

import { useMediaQuery, useOutsideClick } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Title } from '~/styles'
import Twitter from '~/components/Icons/Twitter'
import Telegram from '~/components/Icons/Telegram'

import haiLogo from '~/assets/logo.png'

export function Header() {
    const isLargerThanSmall = useMediaQuery('upToSmall')

    const [dropdownButton, setDropdownButton] = useState<HTMLElement>()
    const [dropdownActive, setDropdownActive] = useState(false)
    useOutsideClick(dropdownButton, () => setDropdownActive(false))

    return (
        <Container>
            <CenteredFlex $gap={24}>
                <Logo src={haiLogo} alt="HAI" width={918} height={330}/>
                {isLargerThanSmall && (<>
                    <HeaderLink>Learn</HeaderLink>
                    <HeaderLink>Docs</HeaderLink>
                    <HeaderLink>Connect</HeaderLink>
                </>)}
            </CenteredFlex>
            <CenteredFlex $gap={24}>
                {isLargerThanSmall && (<>
                    <Twitter/>
                    <Telegram/>
                </>)}
                <HaiButton $variant="yellowish">Coming Soon</HaiButton>
                {!isLargerThanSmall && (
                    <DropdownButton
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
            </CenteredFlex>
        </Container>
    )
}

const Container = styled(Flex).attrs(props => ({
    $align: 'center',
    ...props
}))`
    justify-content: space-between;
    position: fixed;
    top: 0px;
    left: 0px;
    right: 0px;
    height: 80px;
    padding: 24px;
    background: #bfe3f1;
    border-bottom: ${({ theme }) => theme.border.medium};
    box-shadow: 0 3px 17px rgba(0,0,0,0.3);

    & svg {
        stroke: black;
        stroke-width: 1.5px;
        width: auto;
        height: 24px;
    }

    z-index: 2;
`
const Logo = styled.img`
    width: auto;
    height: 60px;
`

const HeaderLink = styled(Title).attrs(props => ({
    $fontSize: '1.6rem',
    $letterSpacing: '0.2rem',
    $textTransform: 'uppercase',
    $fontWeight: 900,
    ...props
}))`
    &:nth-of-type(1) {
        color: ${({ theme }) => theme.colors.pinkish};
    }
    &:nth-of-type(2) {
        color: ${({ theme }) => theme.colors.orangeish};
    }
    &:nth-of-type(3) {
        color: ${({ theme }) => theme.colors.greenish};
    }
    &:nth-of-type(4) {
        color: ${({ theme }) => theme.colors.blueish};
    }
    &:nth-of-type(5) {
        color: ${({ theme }) => theme.colors.pinkish};
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
    width: 240px;
    background-color: #bfe3f1;
    box-shadow: 0 3px 17px rgba(0,0,0,0.3);
    border: ${({ theme }) => theme.border.medium};
    & > * {
        padding: 4px 8px;
    }
`