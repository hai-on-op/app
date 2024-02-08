import { useState } from 'react'

import type { SetState } from '~/types'
import { LINK_TO_DISCORD, LINK_TO_DOCS, LINK_TO_TELEGRAM, LINK_TO_TWITTER } from '~/utils'
import { useOutsideClick } from '~/hooks'

import styled from 'styled-components'
import { HaiButton, Popout } from '~/styles'
import { Hamburger } from '~/components/Icons/Hamburger'
import { BrandedDropdown } from '~/components/BrandedDropdown'
import { FileText, Grid } from 'react-feather'
import { Twitter } from '~/components/Icons/Twitter'
import { Telegram } from '~/components/Icons/Telegram'
import { Discord } from '~/components/Icons/Discord'
// import { ConnectButton } from '~/components/ConnectButton'

type MobileMenuProps = {
    active: boolean
    setActive: SetState<boolean>
    showWrapEth: () => void
}
export function MobileMenu({ active, setActive }: MobileMenuProps) {
    const [button, setButton] = useState<HTMLElement | null>(null)

    useOutsideClick(button, () => setActive(false))

    return (
        <DropdownButton as="div" $variant="yellowish" ref={setButton} onClick={() => setActive((a) => !a)}>
            <Hamburger size={20} />
            {active && (
                <Dropdown $float="left" $margin="24px">
                    {/* <ConnectButton $width="100%"/> */}
                    {/* <InternalLink href="/vaults" $textDecoration="none" content={<HeaderLink>Get HAI</HeaderLink>} />
                    <InternalLink href="/earn" $textDecoration="none" content={<HeaderLink>Earn</HeaderLink>} />
                    <InternalLink href="/learn" $textDecoration="none" content={<HeaderLink>Learn</HeaderLink>} />
                    <InternalLink href="/auctions" $textDecoration="none" content={<HeaderLink>Auctions</HeaderLink>} />
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
                    <HeaderLink onClick={showWrapEth}>Wrap ETH</HeaderLink> */}
                    <BrandedDropdown.Item
                        icon={<Grid size={18} />}
                        onClick={() => {
                            const zoomEl = document.getElementById('zoom-scroll-container')
                            if (!zoomEl) return
                            zoomEl.scrollTop = 3 * window.innerHeight
                        }}
                    >
                        Learn
                    </BrandedDropdown.Item>
                    <BrandedDropdown.Item
                        href={LINK_TO_DOCS}
                        icon={<FileText size={18} />}
                    >
                        Docs
                    </BrandedDropdown.Item>
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
                        icon={<Discord size={18} stroke="black" strokeWidth={2} />}
                    >
                        Discord
                    </BrandedDropdown.Item>
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
    width: fit-content;
    padding: 12px;
    margin-right: -19px;
    gap: 4px;
    cursor: default;
`
// const HeaderLink = styled(Title).attrs((props) => ({
//     $fontSize: '1.6em',
//     $lineHeight: '1',
//     $letterSpacing: '0.2rem',
//     $textTransform: 'uppercase',
//     $textAlign: 'left',
//     ...props,
// }))<{ $active?: boolean }>`
//     width: 100%;
//     display: flex;
//     justify-content: flex-start;
//     align-items: center;
//     padding: 0 12px;
//     text-shadow: none;
//     -webkit-text-stroke: 0px;
//     font-weight: ${({ $active = false }) => ($active ? 700 : 400)};
// `
