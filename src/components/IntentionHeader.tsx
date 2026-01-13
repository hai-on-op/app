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
import { kiteConfig } from '~/staking/configs/kite'
import { haiBoldCurveLpConfig } from '~/staking/configs/haiBoldCurveLp'
import { haiVeloVeloLpConfig } from '~/staking/configs/haiVeloVeloLp'

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
        ctaLink: `${LINK_TO_DOCS}`,
    },
    [Intention.BORROW]: {
        subtitle: 'Mint & borrow HAI against your preferred collateral. ',
        cta: 'Read more about borrowing →',
        ctaLink: `${LINK_TO_DOCS}`,
    },
    [Intention.EARN]: {
        subtitle: 'Participate in DAO incentive campaigns to earn rewards. ',
        cta: 'Read more about earning opportunities →',
        ctaLink: `${LINK_TO_DOCS}`,
    },
    [Intention.STAKE]: {
        subtitle: 'Stake KITE to earn protocol revenue and boost your incentives. ',
        cta: 'Read more about staking →',
        ctaLink: `${LINK_TO_DOCS}`,
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
        label: `STAKE ${haiBoldCurveLpConfig.labels.token}`,
        value: 'stake/hai-bold-curve-lp',
        icon: ['HAI'],
        description: `Stake ${haiBoldCurveLpConfig.labels.token} to earn rewards.`,
    },
    {
        label: `STAKE ${haiVeloVeloLpConfig.labels.token}`,
        value: 'stake/hai-velo-velo-lp',
        icon: ['HAIVELOV2', 'VELO'],
        description: `Stake ${haiVeloVeloLpConfig.labels.token} to earn rewards.`,
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
        ctaLink: '/vaults/open?collateral=HAIVELOV2',
        tokenImages: ['HAIVELOV2'],
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

    const { type, stats, stakeConfig } = useMemo(() => {
        if (location.pathname.startsWith('/auctions')) {
            return {
                type: Intention.AUCTION,
                stats: <AuctionStats />,
                stakeConfig: undefined,
            }
        }
        if (location.pathname.startsWith('/earn')) {
            return {
                type: Intention.EARN,
                stats: <EarnStats />,
                stakeConfig: undefined,
            }
        }
        if (location.pathname.startsWith('/stake')) {
            let currentStakeConfig
            if (location.pathname === '/stake') {
                currentStakeConfig = kiteConfig
            } else if (location.pathname === '/stake/hai-bold-curve-lp') {
                currentStakeConfig = haiBoldCurveLpConfig
            } else if (location.pathname === '/stake/hai-velo-velo-lp') {
                currentStakeConfig = haiVeloVeloLpConfig
            }
            return {
                type: Intention.STAKE,
                stats: <StakeStats config={currentStakeConfig} />,
                stakeConfig: currentStakeConfig,
            }
        }
        if (location.pathname.startsWith('/vaults') || location.pathname === '/haiVELO' || location.pathname === '/haiAERO') {
            switch (location.pathname) {
                case '/vaults':
                case '/vaults/manage':
                case '/vaults/open':
                case '/haiVELO':
                case '/haiAERO':
                    // If opening haiVELO(v2) or haiAERO collateral, show special stats
                    if (
                        location.pathname === '/haiVELO' ||
                        ['HAIVELO', 'HAIVELOV2'].includes(new URLSearchParams(location.search).get('collateral') || '')
                    ) {
                        return {
                            type: Intention.BORROW,
                            stats: <HaiVeloStats />,
                            stakeConfig: undefined,
                        }
                    }
                    // haiAERO uses similar stats for now
                    if (
                        location.pathname === '/haiAERO' ||
                        ['HAIAERO'].includes(new URLSearchParams(location.search).get('collateral') || '')
                    ) {
                        return {
                            type: Intention.BORROW,
                            stats: <HaiVeloStats />, // Can be replaced with HaiAeroStats if needed
                            stakeConfig: undefined,
                        }
                    }
                    return { type: Intention.BORROW, stats: <BorrowStats />, stakeConfig: undefined }
                default:
                    return { type: undefined, stats: undefined, stakeConfig: undefined }
            }
        }

        return { type: undefined, stats: undefined, stakeConfig: undefined }
    }, [location.pathname, location.search])

    // Build select options, including dedicated haiVELO and haiAERO entries after the primary borrow option
    const selectOptions: BrandedSelectOption[] = useMemo(() => {
        const haiVeloOption: BrandedSelectOption = {
            label: 'Get haiVELO',
            value: 'haiVELO',
            icon: ['HAIVELOV2'],
            description: 'Convert VELO into haiVELO and mint against it',
        }

        const haiAeroOption: BrandedSelectOption = {
            label: 'Get haiAERO',
            value: 'haiAERO',
            icon: ['HAIVELOV2'], // TODO: Add HAIAERO icon when available
            description: 'Convert AERO into haiAERO on Base and bridge to Optimism',
        }

        const extended: BrandedSelectOption[] = []

        for (const opt of typeOptions) {
            extended.push(opt)
            if (opt.value === Intention.BORROW) {
                extended.push(haiVeloOption)
                extended.push(haiAeroOption)
            }
        }

        return extended
    }, [])

    if (!type) return null

    const isHaiVeloOpen =
        location.pathname === '/haiVELO' ||
        (location.pathname === '/vaults/open' &&
            ['HAIVELO', 'HAIVELOV2'].includes(new URLSearchParams(location.search).get('collateral') || ''))

    const isHaiAeroOpen =
        location.pathname === '/haiAERO' ||
        (location.pathname === '/vaults/open' &&
            ['HAIAERO'].includes(new URLSearchParams(location.search).get('collateral') || ''))

    const isMinterOpen = isHaiVeloOpen || isHaiAeroOpen

    const baseCopy = copy[type]
    const isLpStaking = stakeConfig && stakeConfig.namespace !== 'kite'
    const subtitle = isHaiVeloOpen
        ? 'Convert your VELO & veVELO into haiVELO to use as collateral while earning veVELO rewards. '
        : isHaiAeroOpen
        ? 'Convert your AERO on Base into haiAERO and bridge to Optimism to use as collateral. '
        : isLpStaking
        ? `Stake ${stakeConfig.labels.token} to earn rewards. `
        : baseCopy.subtitle
    let cta = baseCopy.cta
    let ctaLink = baseCopy.ctaLink
    if (isHaiVeloOpen) {
        cta = 'Read more about haiVELO →'
        ctaLink = 'https://docs.letsgethai.com/using-haivelo'
    } else if (isHaiAeroOpen) {
        cta = 'Read more about haiAERO →'
        ctaLink = 'https://docs.letsgethai.com/using-haiaero' // Update when docs are available
    }

    const selectedValue = isHaiVeloOpen
        ? 'haiVELO'
        : isHaiAeroOpen
        ? 'haiAERO'
        : location.pathname === '/stake'
        ? 'stake'
        : location.pathname === '/stake/hai-bold-curve-lp'
        ? 'stake/hai-bold-curve-lp'
        : location.pathname === '/stake/hai-velo-velo-lp'
        ? 'stake/hai-velo-velo-lp'
        : (type as unknown as string) || ''

    return (
        <Container>
            <Inner>
                <Flex $justify="flex-start" $align="center" $gap={12} $flexWrap>
                    <BrandedTitle textContent="I WANT TO" $fontSize={isUpToExtraSmall ? '2.5em' : '3.2em'} />
                    <BrandedSelect
                        value={selectedValue}
                        onChange={(value: string) => !!value && history.push(`/${value}`)}
                        options={selectOptions}
                        uppercase={!isMinterOpen}
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
                {(() => {
                    // Hide haiVELO banner while on minter protocol routes (haiVELO, haiAERO)
                    const isMinterRoute =
                        location.pathname === '/haiVELO' ||
                        location.pathname === '/haiAERO' ||
                        (location.pathname.startsWith('/vaults') &&
                            ['HAIVELO', 'HAIVELOV2', 'HAIAERO'].includes(
                                new URLSearchParams(location.search).get('collateral') || ''
                            ))

                    return haiVeloEnabled && !isMinterRoute ? (
                        <>
                            {wrappers.map((wrapper, i) => (
                                <WrapperAd key={i} bgVariant={i} {...wrapper} />
                            ))}
                        </>
                    ) : null
                })()}
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
