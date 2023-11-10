import { type ReactNode } from 'react'

import { LINK_TO_DOCS, TOKEN_LOGOS } from '~/utils'

import styled from 'styled-components'
import { BlurContainer, Flex, Text, Title } from '~/styles'
import { BrandedTitle } from './BrandedTitle'
import { ExternalLink } from './ExternalLink'
import { BrandedSelect } from './BrandedSelect'
import HaiFace from './Icons/HaiFace'

type IntentionType = 'earn' | 'borrow'

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
    }
}

const typeOptions = [
    {
        label: 'GET HAI',
        value: 'borrow',
        icon: <HaiFace filled/>,
        description: 'Mint & borrow $HAI stablecoin against your preferred collateral'
    },
    {
        label: 'EARN REWARDS',
        value: 'earn',
        icon: TOKEN_LOGOS.OP,
        description: 'Earn long term yields by staking a growing list of crypto assets'
    }
]

type IntentionHeaderProps = {
    type: 'earn' | 'borrow',
    setType: (type: string) => void,
    setAssets?: (assets: string) => void,
    children?: JSX.Element | ReactNode | ReactNode[]
}
export function IntentionHeader({ type, setType, setAssets, children }: IntentionHeaderProps) {
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
                        onChange={(value: string) => setType(value)}
                        options={typeOptions}
                    />
                    {type === 'borrow' && (<>
                        <Title
                            $color="orangeish"
                            $fontSize="3.2em">
                            ON
                        </Title>
                        <BrandedSelect
                            value="all"
                            onChange={(value: string) => setAssets?.(value)}
                            options={[
                                { label: 'ALL ASSETS', value: 'all' }
                            ]}
                        />
                    </>)}
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
`

const Inner = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 36,
    ...props
}))``