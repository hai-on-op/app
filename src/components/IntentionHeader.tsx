import { useMemo } from 'react'
import { useHistory, useLocation } from 'react-router-dom'

import type { ReactChildren } from '~/types'
import { LINK_TO_DOCS, TOKEN_LOGOS } from '~/utils'

import styled from 'styled-components'
import { BlurContainer, Flex, Text } from '~/styles'
import { HaiFace } from './Icons/HaiFace'
import { BrandedTitle } from './BrandedTitle'
import { ExternalLink } from './ExternalLink'
import { BrandedSelect } from './BrandedSelect'
import { BorrowStats } from '~/containers/Vaults/Stats'
import { EarnStats } from '~/containers/Earn/Stats'
import { AuctionStats } from '~/containers/Auctions/Stats'

import uniswapLogo from '~/assets/uniswap-icon.svg'

enum Intention {
    AUCTION = 'auctions',
    BORROW = 'vaults',
    EARN = 'earn',
}

const copy: Record<Intention, {
    subtitle: string,
    cta: string,
    ctaLink: string,
}> = {
    [Intention.AUCTION]: {
        subtitle: 'Buy your favorite crypto assets from liquidated loan auctions at a discount. ',
        cta: 'Read more about auctions →',
        ctaLink: LINK_TO_DOCS,
    },
    [Intention.BORROW]: {
        subtitle: 'Mint & borrow HAI against your preferred collateral. ',
        cta: 'Read more about borrowing →',
        ctaLink: LINK_TO_DOCS,
    },
    [Intention.EARN]: {
        subtitle: 'Stake various liquidity positions to earn yields. ',
        cta: 'Read more about earning opportunities →',
        ctaLink: LINK_TO_DOCS,
    },
}

const typeOptions = [
    {
        label: 'Get $HAI',
        value: Intention.BORROW,
        icon: <HaiFace filled/>,
        description: 'Mint & borrow $HAI stablecoin against your preferred collateral',
    },
    {
        label: 'Buy $HAI',
        value: '',
        icon: uniswapLogo,
        description: 'Market buy $HAI from various pairs on Uniswap',
        href: 'https://app.uniswap.org/swap',
    },
    {
        label: 'Earn Rewards',
        value: Intention.EARN,
        icon: [
            TOKEN_LOGOS.OP,
            TOKEN_LOGOS.WETH,
            TOKEN_LOGOS.WSTETH,
        ],
        description: 'Earn long term yields by staking a growing list of crypto assets',
    },
    {
        label: 'Buy Liquidated Assets',
        value: Intention.AUCTION,
        icon: [
            TOKEN_LOGOS.OP,
            TOKEN_LOGOS.WETH,
            TOKEN_LOGOS.WSTETH,
        ],
        description: 'Buy your favorite assets from liquidated loans at a discount',
    },
]

type IntentionHeaderProps = {
    children?: ReactChildren,
}
export function IntentionHeader({ children }: IntentionHeaderProps) {
    const location = useLocation()
    const history = useHistory()

    const { type, stats } = useMemo(() => {
        if (location.pathname.startsWith('/auctions')) {
            return {
                type: Intention.AUCTION,
                stats: <AuctionStats/>,
            }
        }
        if (location.pathname.startsWith('/earn')) {
            return {
                type: Intention.EARN,
                stats: <EarnStats/>,
            }
        }
        if (location.pathname.startsWith('/vaults') && location.pathname !== '/vaults/explore') {
            return {
                type: Intention.BORROW,
                stats: <BorrowStats/>,
            }
        }

        return {}
    }, [location.pathname])

    if (!type) return null

    const { subtitle, cta, ctaLink } = copy[type]

    return (
        <Container>
            <Inner>
                <Flex
                    $justify="flex-start"
                    $align="center"
                    $gap={12}
                    $flexWrap>
                    <BrandedTitle
                        textContent="I WANT TO"
                        $fontSize="3.2em"
                    />
                    <BrandedSelect
                        value={type}
                        onChange={(value: string) => !!value && history.push(`/${value}`)}
                        options={typeOptions}
                    />
                </Flex>
                <Text>
                    {subtitle}
                    <ExternalLink
                        href={ctaLink}
                        $fontWeight={700}>
                        {cta}
                    </ExternalLink>
                </Text>
                {stats}
                {children}
            </Inner>
        </Container>
    )
}

const Container = styled(BlurContainer).attrs(props => ({
    $width: '100%',
    ...props,
}))`
    overflow: visible;
    position: relative;
    z-index: 1;
`

const Inner = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 36,
    ...props,
}))``
