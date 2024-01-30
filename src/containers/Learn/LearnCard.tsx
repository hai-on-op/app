import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'
import { ExternalLink } from '~/components/ExternalLink'
import { BrandedTitle } from '~/components/BrandedTitle'
import { HaiArrow } from '~/components/Icons/HaiArrow'

type LearnCardProps = {
    title: string
    description?: string
    link: string
    titleColorOffset?: number
}
export function LearnCard({ title, description, link, titleColorOffset }: LearnCardProps) {
    const isLargerThanExtraSmall = useMediaQuery('upToExtraSmall')

    return (
        <Container>
            <Flex $column $gap={24}>
                <BrandedTitle
                    textContent={title}
                    $fontSize={isLargerThanExtraSmall ? '2.2rem' : '1.9rem'}
                    $letterSpacing="0.2rem"
                    $lineHeight="1.4"
                    colorOffset={titleColorOffset}
                />
                {!!description && <Text>{description}</Text>}
            </Flex>
            <ExternalLink href={link} $textDecoration="none">
                <CenteredFlex $gap={12}>
                    <Text
                        $fontSize={isLargerThanExtraSmall ? '1.2rem' : '1rem'}
                        $fontWeight={700}
                        $letterSpacing="0.35rem"
                    >
                        LEARN MORE
                    </Text>
                    <HaiArrow direction="right" strokeWidth={2.5} />
                </CenteredFlex>
            </ExternalLink>
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
