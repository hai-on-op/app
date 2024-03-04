import type { ReactChildren } from '~/types'
import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'
import { BrandedTitle } from '~/components/BrandedTitle'
import { HaiArrow } from '~/components/Icons/HaiArrow'
import { Link } from '~/components/Link'
import { ComingSoon } from '~/components/ComingSoon'

type LearnCardProps = {
    title: string
    description?: string
    link: ReactChildren
    titleColorOffset?: number
    comingSoon?: boolean
}
export function LearnCard({ title, description, link, titleColorOffset, comingSoon = false }: LearnCardProps) {
    const isUpToExtraSmall = useMediaQuery('upToExtraSmall')

    return (
        <Container>
            <Flex $column $gap={24}>
                <BrandedTitle
                    textContent={title}
                    $fontSize={isUpToExtraSmall ? '2.2rem' : '1.9rem'}
                    $letterSpacing="0.2rem"
                    $lineHeight="1.4"
                    colorOffset={titleColorOffset}
                />
                {!!description && <Text>{description}</Text>}
            </Flex>
            <ComingSoon active={comingSoon} width="100%">
                {typeof link !== 'string' ? (
                    link
                ) : (
                    <Link href={link} $textDecoration="none">
                        <CenteredFlex $gap={12}>
                            <Text
                                $fontSize={isUpToExtraSmall ? '1.2rem' : '1rem'}
                                $fontWeight={700}
                                $letterSpacing="0.35rem"
                            >
                                LEARN MORE
                            </Text>
                            <HaiArrow direction="right" strokeWidth={2.5} />
                        </CenteredFlex>
                    </Link>
                )}
            </ComingSoon>
        </Container>
    )
}

const Container = styled(Flex).attrs((props) => ({
    $column: true,
    $justify: 'space-between',
    $align: 'flex-start',
    $shrink: 0,
    ...props,
}))`
    position: relative;
    max-width: 360px;
    width: 100%;
    height: 360px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;
    backdrop-filter: blur(13px);
    padding: 48px 36px;
    transition: all 0.5s ease;

    & svg {
        width: auto;
        height: 1.2rem;
    }

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        padding: 36px;
    `}
`
