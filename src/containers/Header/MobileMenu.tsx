import { useState } from 'react'

import type { SetState } from '~/types'
import { LINK_TO_DOCS, LINK_TO_TELEGRAM, LINK_TO_TWITTER } from '~/utils'
import { useOutsideClick } from '~/hooks'

import styled from 'styled-components'
import { HaiButton, Popout, Title } from '~/styles'
import { ExternalLink } from '~/components/ExternalLink'
import { InternalLink } from '~/components/InternalLink'
import { Hamburger } from '~/components/Icons/Hamburger'
import { ConnectButton } from '~/components/ConnectButton'

type MobileMenuProps = {
    active: boolean,
    setActive: SetState<boolean>,
    showWrapEth: () => void
}
export function MobileMenu({ active, setActive, showWrapEth }: MobileMenuProps) {
    const [button, setButton] = useState<HTMLElement | null>(null)
    
    useOutsideClick(button, () => setActive(false))

    return (
        <DropdownButton
            as="div"
            $variant="yellowish"
            ref={setButton}
            onClick={() => setActive(a => !a)}>
            <Hamburger size={20}/>
            {active && (
                <Dropdown
                    $float="left"
                    $margin="24px">
                    <ConnectButton $width="100%"/>
                    {/* TODO: replace links */}
                    <InternalLink
                        href="/vaults"
                        $textDecoration="none"
                        content={<HeaderLink>Get HAI</HeaderLink>}
                    />
                    <InternalLink
                        href="/earn"
                        $textDecoration="none"
                        content={<HeaderLink>Earn</HeaderLink>}
                    />
                    <InternalLink
                        href="/learn"
                        $textDecoration="none"
                        content={<HeaderLink>Learn</HeaderLink>}
                    />
                    <InternalLink
                        href="/auctions"
                        $textDecoration="none"
                        content={<HeaderLink>Auctions</HeaderLink>}
                    />
                    <InternalLink
                        href="/analytics"
                        $textDecoration="none"
                        content={<HeaderLink>Analytics</HeaderLink>}
                    />
                    <InternalLink
                        href="/vaults/explore"
                        $textDecoration="none"
                        content={<HeaderLink>Explore Vaults</HeaderLink>}
                    />
                    <InternalLink
                        href="/contracts"
                        $textDecoration="none"
                        content={<HeaderLink>Contracts</HeaderLink>}
                    />
                    <HeaderLink onClick={showWrapEth}>Wrap ETH</HeaderLink>
                    <ExternalLink
                        href={LINK_TO_DOCS}
                        $textDecoration="none">
                        <HeaderLink>Docs</HeaderLink>
                    </ExternalLink>
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
    )
}

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
const HeaderLink = styled(Title).attrs(props => ({
    $fontSize: '1.6em',
    $lineHeight: '1',
    $letterSpacing: '0.2rem',
    $textTransform: 'uppercase',
    $textAlign: 'left',
    ...props,
}))<{ $active?: boolean }>`
    width: 100%;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding: 0 12px;
    text-shadow: none;
    -webkit-text-stroke: 0px;
    font-weight: ${({ $active = false }) => $active ? 700: 400};
`
