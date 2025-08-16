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
import { StakeStats } from '~/containers/Stake/Stats'
import { WrapperAd, WrapperAdProps } from './WrapperAd'
import { HaiVeloStats } from '~/containers/Vaults/HaiVeloStats'

enum Intention {
    AUCTION = 'auctions',
    BORROW = 'vaults',
    EARN = 'earn',
    STAKE = 'stake',
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
    [Intention.STAKE]: {
        subtitle: 'Stake KITE to earn protocol revenue and boost your incentives. ',
        cta: 'Read more about staking →',
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
        label: 'Earn Rewards',
        value: Intention.EARN,
        icon: ['HAI', 'OP'],
        description: 'Earn long term yields by staking a growing list of crypto assets',
    },
    {
        label: 'STAKE $KITE',
        value: Intention.STAKE,
        icon: ['KITE'],
        description: 'Stake KITE to earn revenue share and boost your HAI minting incentives.',
    },
    {
        label: 'Buy $HAI',
        value: '',
        icon: <img src={uniswapLogo} alt="" />,
        description: 'Market buy $HAI from various pairs on Uniswap',
        href: 'https://swap.defillama.com/?chain=optimism&from=&to=0x10398abc267496e49106b07dd6be13364d10dc71',
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
        ctaLink: '',
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
        if (location.pathname.startsWith('/stake')) {
            return {
                type: Intention.STAKE,
                stats: <StakeStats />,
            }
        }
        if (location.pathname.startsWith('/vaults')) {
            switch (location.pathname) {
                case '/vaults':
                case '/vaults/manage':
                case '/vaults/open':
                    // If opening haiVELO collateral, show special haiVELO stats
                    if (new URLSearchParams(location.search).get('collateral') === 'HAIVELO') {
                        return {
                            type: Intention.BORROW,
                            stats: <HaiVeloStats />,
                        }
                    }
                    return { type: Intention.BORROW, stats: <BorrowStats /> }
                default:
                    return {}
            }
        }

        return {}
    }, [location.pathname])

    if (!type) return null

    const { subtitle, cta, ctaLink } = copy[type]

    // Adjust select options label when on haiVELO open page
    const selectOptions: BrandedSelectOption[] = useMemo(() => {
        // Always include a dedicated haiVELO option (do not replace existing Get $HAI)
        const haiVeloOption: BrandedSelectOption = {
            label: 'Get haiVELO',
            value: 'vaults/open?collateral=HAIVELO',
            icon: ['HAIVELO'],
            description: 'Convert VELO into haiVELO and mint against it',
        }

        const extended: BrandedSelectOption[] = []
        for (const opt of typeOptions) {
            extended.push(opt)
            if (opt.value === Intention.BORROW) {
                extended.push(haiVeloOption)
            }
        }
        return extended
    }, [])

    const isHaiVeloOpen = location.pathname === '/vaults/open' &&
        new URLSearchParams(location.search).get('collateral') === 'HAIVELO'

    const selectedValue = isHaiVeloOpen ? 'vaults/open?collateral=HAIVELO' : (type as unknown as string)

    return (
        <Container>
            <Inner>
                <Flex $justify="flex-start" $align="center" $gap={12} $flexWrap>
                    <BrandedTitle textContent="I WANT TO" $fontSize={isUpToExtraSmall ? '2.5em' : '3.2em'} />
                    <BrandedSelect
                        value={selectedValue}
                        onChange={(value: string) => !!value && history.push(`/${value}`)}
                        options={selectOptions}
                        uppercase={!isHaiVeloOpen}
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
