import type { ReactChildren } from '~/types'
import { LINK_TO_DOCS, TOKEN_LOGOS } from '~/utils'

import styled from 'styled-components'
import { BlurContainer, Flex, Text } from '~/styles'
import { BrandedTitle } from './BrandedTitle'
import { ExternalLink } from './ExternalLink'
import { BrandedSelect } from './BrandedSelect'
import { HaiFace } from './Icons/HaiFace'

import uniswapLogo from '~/assets/uniswap-icon.svg'

type IntentionType = 'earn' | 'borrow' | 'auctions'

const copy: Record<IntentionType, {
    subtitle: string,
    cta: string,
    ctaLink: string
}> = {
    earn: {
        subtitle: 'Stake various liquidity positions to earn yields. ',
        cta: 'Read more about earning opportunities →',
        ctaLink: LINK_TO_DOCS
    },
    borrow: {
        subtitle: 'Mint & borrow HAI against your preferred collateral. ',
        cta: 'Read more about borrowing →',
        ctaLink: LINK_TO_DOCS
    },
    auctions: {
        subtitle: 'Buy your favorite crypto assets from liquidated loan auctions at a discount. ',
        cta: 'Read more about auctions →',
        ctaLink: LINK_TO_DOCS
    }
}

const typeOptions = [
    {
        label: 'Get $HAI',
        value: 'borrow',
        icon: <HaiFace filled/>,
        description: 'Mint & borrow $HAI stablecoin against your preferred collateral'
    },
    {
        label: 'Buy $HAI',
        value: '',
        icon: uniswapLogo,
        description: 'Market buy $HAI from various pairs on Uniswap',
        href: 'https://app.uniswap.org/swap'
    },
    {
        label: 'Earn Rewards',
        value: 'earn',
        icon: [
            TOKEN_LOGOS.OP,
            TOKEN_LOGOS.WETH,
            TOKEN_LOGOS.WSTETH
        ],
        description: 'Earn long term yields by staking a growing list of crypto assets'
    },
    {
        label: 'Buy Liquidated Assets',
        value: 'auctions',
        icon: [
            TOKEN_LOGOS.OP,
            TOKEN_LOGOS.WETH,
            TOKEN_LOGOS.WSTETH
        ],
        description: 'Buy your favorite assets from liquidated loans at a discount'
    }
]

type IntentionHeaderProps = {
    type: 'earn' | 'borrow' | 'auctions',
    setType: (type: string) => void,
    children?: ReactChildren
}
export function IntentionHeader({ type, setType, children }: IntentionHeaderProps) {
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
                        onChange={(value: string) => !!value && setType(value)}
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
                {children}
            </Inner>
        </Container>
    )
}

const Container = styled(BlurContainer).attrs(props => ({
    $width: '100%',
    ...props
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
    ...props
}))``