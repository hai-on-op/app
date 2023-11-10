import { type ChangeEvent, type ReactNode } from 'react'

import { LINK_TO_DOCS } from '~/utils'

import styled from 'styled-components'
import { BlurContainer, Flex, Text, Title } from '~/styles'
import { BrandedTitle } from './BrandedTitle'
import { ExternalLink } from './ExternalLink'
import { BrandedSelect } from './BrandedSelect'

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
                        $fontSize="3.6em"
                    />
                    <BrandedSelect
                        width={type === 'earn' ? '510px': '280px'}
                        value={type}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setType(e.currentTarget.value)}
                        options={[
                            { label: 'EARN REWARDS', value: 'earn' },
                            { label: 'GET HAI', value: 'borrow' }
                        ]}
                    />
                    {type === 'borrow' && (<>
                        <Title
                            $color="orangeish"
                            $fontSize="3.6em">
                            ON
                        </Title>
                        <BrandedSelect
                            width="380px"
                            value="all"
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setAssets?.(e.currentTarget.value)}
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
}))``

const Inner = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 24,
    ...props
}))``