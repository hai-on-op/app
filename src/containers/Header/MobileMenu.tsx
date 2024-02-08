import { useState } from 'react'

import type { SetState } from '~/types'
import { ChainId, LINK_TO_DISCORD, LINK_TO_DOCS, LINK_TO_TELEGRAM, LINK_TO_TWITTER, NETWORK_ID } from '~/utils'
import { useMediaQuery, useOutsideClick } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Popout } from '~/styles'
import { ExternalLink } from '~/components/ExternalLink'
import { InternalLink } from '~/components/InternalLink'
import { Hamburger } from '~/components/Icons/Hamburger'
import { ConnectButton } from '~/components/ConnectButton'
import { DropdownOption } from '~/components/BrandedDropdown'
import {
    ArrowUpRight,
    BarChart,
    Database,
    Download,
    File,
    FileText,
    Grid,
    Repeat,
    Search,
    ShoppingBag,
    TrendingUp,
} from 'react-feather'
import { Twitter } from '~/components/Icons/Twitter'
import { Telegram } from '~/components/Icons/Telegram'
import { Discord } from '~/components/Icons/Discord'
import { Caret } from '~/components/Icons/Caret'

type MobileMenuProps = {
    active: boolean
    setActive: SetState<boolean>
    showWrapEth: () => void
}
export function MobileMenu({ active, setActive, showWrapEth }: MobileMenuProps) {
    const isLargerThanSmall = useMediaQuery('upToSmall')
    const isLargerThanMedium = useMediaQuery('upToMedium')
    const isLargerThanLarge = useMediaQuery('upToLarge')

    const [button, setButton] = useState<HTMLElement | null>(null)

    useOutsideClick(button, () => setActive(false))

    return (
        <DropdownButton
            as="div"
            $variant={isLargerThanSmall ? undefined : 'yellowish'}
            ref={setButton}
            onClick={() => setActive((a) => !a)}
        >
            {!isLargerThanSmall ? (
                <Hamburger size={20} />
            ) : (
                <CenteredFlex $gap={12}>
                    {!isLargerThanMedium ? 'Menu' : 'More'}
                    <IconContainer $rotate={active}>
                        <Caret direction="down" />
                    </IconContainer>
                </CenteredFlex>
            )}
            {active && (
                <Dropdown $float="left" $margin="20px">
                    <Inner>
                        {!isLargerThanSmall && <ConnectButton $width="100%" showBalance="vertical" />}
                        {!isLargerThanMedium && (
                            <>
                                <InternalLink
                                    href="/vaults"
                                    content={
                                        <DropdownOption $active={location.pathname.startsWith('/vaults')}>
                                            <Database size={18} />
                                            Get HAI
                                        </DropdownOption>
                                    }
                                />
                                <InternalLink
                                    href="/earn"
                                    content={
                                        <DropdownOption $active={location.pathname === '/earn'}>
                                            <TrendingUp size={18} />
                                            Earn
                                        </DropdownOption>
                                    }
                                />
                            </>
                        )}
                        {!isLargerThanLarge && (
                            <InternalLink
                                href="/learn"
                                content={
                                    <DropdownOption $active={location.pathname === '/learn'}>
                                        <Grid size={18} />
                                        Learn
                                    </DropdownOption>
                                }
                            />
                        )}
                        <InternalLink
                            href="/auctions"
                            content={
                                <DropdownOption $active={location.pathname === '/auctions'}>
                                    <ShoppingBag size={18} />
                                    Auctions
                                </DropdownOption>
                            }
                        />
                        <InternalLink
                            href="/analytics"
                            content={
                                <DropdownOption $active={location.pathname === '/analytics'}>
                                    <BarChart size={18} />
                                    Analytics
                                </DropdownOption>
                            }
                        />
                        <InternalLink
                            href="/contracts"
                            content={
                                <DropdownOption $active={location.pathname === '/contracts'}>
                                    <File size={18} />
                                    Contracts
                                </DropdownOption>
                            }
                        />
                        <InternalLink
                            href="/vaults/explore"
                            content={
                                <DropdownOption $active={location.pathname === '/vaults/explore'}>
                                    <Search size={18} />
                                    Vault Explorer
                                </DropdownOption>
                            }
                        />
                        {NETWORK_ID === ChainId.OPTIMISM_SEPOLIA && (
                            <InternalLink
                                href="/test/claim"
                                content={
                                    <DropdownOption $active={location.pathname === '/test/claim'}>
                                        <Download size={18} />
                                        Claim Test Tokens
                                    </DropdownOption>
                                }
                            />
                        )}
                        <DropdownOption onClick={showWrapEth}>
                            <Repeat size={18} />
                            Wrap ETH
                        </DropdownOption>
                        <ExternalLink href={LINK_TO_DOCS}>
                            <DropdownOption>
                                <FileText size={18} />
                                Docs
                                <ArrowUpRight size={18} />
                            </DropdownOption>
                        </ExternalLink>
                        <ExternalLink href={LINK_TO_TWITTER}>
                            <DropdownOption>
                                <Twitter size={16} stroke="black" strokeWidth={2} />
                                Twitter
                                <ArrowUpRight size={18} />
                            </DropdownOption>
                        </ExternalLink>
                        <ExternalLink href={LINK_TO_TELEGRAM}>
                            <DropdownOption>
                                <Telegram size={18} stroke="black" strokeWidth={2} />
                                Telegram
                                <ArrowUpRight size={18} />
                            </DropdownOption>
                        </ExternalLink>
                        <ExternalLink href={LINK_TO_DISCORD}>
                            <DropdownOption>
                                <Discord size={18} stroke="black" strokeWidth={2} />
                                Discord
                                <ArrowUpRight size={18} />
                            </DropdownOption>
                        </ExternalLink>
                    </Inner>
                </Dropdown>
            )}
        </DropdownButton>
    )
}

const DropdownButton = styled(HaiButton)`
    position: relative;
    height: 48px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        width: 48px;
        min-width: unset;
        padding: 0px;
        justify-content: center;
    `}
`
const IconContainer = styled(CenteredFlex)<{ $rotate?: boolean }>`
    transition: all 0.5s ease;
    transform: ${({ $rotate }) => ($rotate ? 'rotate(-180deg)' : 'rotate(0deg)')};
`
const Dropdown = styled(Popout)`
    width: fit-content;
    justify-content: flex-start;
    margin-right: -16px;
    gap: 4px;
    cursor: default;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        margin-right: -19px;
    `}
    ${({ theme }) => theme.mediaWidth.upToMedium`
        padding: 32px 0;
    `}
`
const Inner = styled(Flex).attrs((props) => ({
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 12,
    ...props,
}))`
    width: fit-content;
    padding: 12px;
    max-height: calc(100vh - 300px);
    overflow: hidden auto;

    & > * {
        width: 100%;
        text-decoration: none;
    }

    ${({ theme }) => theme.mediaWidth.upToMedium`
        gap: 6px;
        border-top: 1px solid rgba(0,0,0,0.2);
        border-bottom: 1px solid rgba(0,0,0,0.2);
    `}
`
