import { useMemo } from 'react'
import { useHistory, useLocation } from 'react-router-dom'

import type { ReactChildren } from '~/types'
import { LINK_TO_DOCS } from '~/utils'
import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { BlurContainer, Flex, Text } from '~/styles'
import { BrandedTitle } from './BrandedTitle'
import { BrandedSelect, type BrandedSelectOption } from './BrandedSelect'
import { Link } from './Link'
import { BorrowStats } from '~/containers/Vaults/Stats'
import { EarnStats } from '~/containers/Earn/Stats'
import { AuctionStats } from '~/containers/Auctions/Stats'

import { useFlags } from 'flagsmith/react'

import uniswapLogo from '~/assets/uniswap-icon.svg'
import { WrapperAd, WrapperAdProps } from './WrapperAd'

enum Intention {
    AUCTION = 'auctions',
    BORROW = 'vaults',
    EARN = 'earn',
}

const copy: Record<
    Intention,
    {
        subtitle: string
        cta: string
        ctaLink: string
    }
> = {
    [Intention.AUCTION]: {
        subtitle: 'Buy your favorite crypto assets from auctions at a potential discount. ',
        cta: 'Read more about auctions →',
        ctaLink: `${LINK_TO_DOCS}detailed/auctions/index.html`,
    },
    [Intention.BORROW]: {
        subtitle: 'Mint & borrow HAI against your preferred collateral. ',
        cta: 'Read more about borrowing →',
        ctaLink: `${LINK_TO_DOCS}detailed/intro/hai.html`,
    },
    [Intention.EARN]: {
        subtitle: 'Participate in DAO incentive campaigns to earn rewards. ',
        cta: 'Read more about earning opportunities →',
        ctaLink: `${LINK_TO_DOCS}detailed/intro/hai.html`,
    },
}

const typeOptions: BrandedSelectOption[] = [
    {
        label: 'Get $HAI',
        value: Intention.BORROW,
        icon: ['HAI'],
        description: 'Mint & borrow $HAI stablecoin against your preferred collateral',
    },
    {
        label: 'Buy $HAI',
        value: '',
        icon: <img src={uniswapLogo} alt="" />,
        description: 'Market buy $HAI from various pairs on Uniswap',
        href: 'https://app.uniswap.org/swap',
    },
    {
        label: 'Earn Rewards',
        value: Intention.EARN,
        icon: ['OP', 'KITE'],
        description: 'Earn long term yields by staking a growing list of crypto assets',
    },
    {
        label: 'Buy Auctioned Assets',
        value: Intention.AUCTION,
        icon: 'ALL_TOKENS',
        description: 'Buy your favorite assets from auctions at a potential discount',
    },
]

const wrappers: WrapperAdProps[] = [
    {
        heading: 'haiVELO',
        status: 'NOW LIVE',
        description: 'Convert your VELO into haiVELO to use as collateral while earning veVELO rewards.',
        cta: 'Mint haiVELO',
        ctaLink: '/earn',
        tokenImages: ['HAIVELO'],
    },
]

type IntentionHeaderProps = {
    children?: ReactChildren
}
export function IntentionHeader({ children }: IntentionHeaderProps) {
    const flags = useFlags(['hai_velo'])
    const haiVeloEnabled = flags.hai_velo?.enabled

    const location = useLocation()
    const history = useHistory()

    const isUpToExtraSmall = useMediaQuery('upToExtraSmall')

    const { type, stats } = useMemo(() => {
        if (location.pathname.startsWith('/auctions')) {
            return {
                type: Intention.AUCTION,
                stats: <AuctionStats />,
            }
        }
        if (location.pathname.startsWith('/earn')) {
            return {
                type: Intention.EARN,
                stats: <EarnStats />,
            }
        }
        if (location.pathname.startsWith('/vaults')) {
            switch (location.pathname) {
                case '/vaults':
                case '/vaults/manage':
                case '/vaults/open':
                    return {
                        type: Intention.BORROW,
                        stats: <BorrowStats />,
                    }
                default:
                    return {}
            }
        }

        return {}
    }, [location.pathname])

    if (!type) return null

    const { subtitle, cta, ctaLink } = copy[type]

    return (
        <Container>
            <Inner>
                <Flex $justify="flex-start" $align="center" $gap={12} $flexWrap>
                    <BrandedTitle textContent="I WANT TO" $fontSize={isUpToExtraSmall ? '2.5em' : '3.2em'} />
                    <BrandedSelect
                        value={type}
                        onChange={(value: string) => !!value && history.push(`/${value}`)}
                        options={typeOptions}
                        $fontSize={isUpToExtraSmall ? '2.5em' : '3.2em'}
                        aria-label="Action"
                    />
                </Flex>
                <Text>
                    {subtitle}

                    <Link href={ctaLink} $fontWeight={700}>
                        {cta}
                    </Link>
                </Text>
                {stats}
                {children}
                {haiVeloEnabled && (
                    <>
                        {wrappers.map((wrapper, i) => (
                            <WrapperAd key={i} bgVariant={i} {...wrapper} />
                        ))}
                    </>
                )}
            </Inner>
        </Container>
    )
}

const Container = styled(BlurContainer).attrs((props) => ({
    $width: '100%',
    ...props,
}))`
    overflow: visible;
    position: relative;
    z-index: 1;
`

const Inner = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 36,
    ...props,
}))``
