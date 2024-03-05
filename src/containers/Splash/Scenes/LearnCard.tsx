import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'
import { BrandedTitle } from '~/components/BrandedTitle'
import { HaiArrow } from '~/components/Icons/HaiArrow'
import { Link } from '~/components/Link'

type LearnCardProps = {
    title: string
    link: string
    titleColorOffset?: number
}
export function LearnCard({ title, link, titleColorOffset }: LearnCardProps) {
    const isUpToSmall = useMediaQuery('upToExtraSmall')

    return (
        <Container>
            <Flex $column $gap={24}>
                <BrandedTitle
                    textContent={title}
                    $fontSize={isUpToSmall ? '1.9rem' : '2.2rem'}
                    $letterSpacing="0.4rem"
                    $lineHeight="1.4"
                    colorOffset={titleColorOffset}
                />
            </Flex>
            <Link href={link} $textDecoration="none">
                <HiddenSEOText>{title}</HiddenSEOText>
                <CenteredFlex $gap={12}>
                    <Text $fontSize={isUpToSmall ? '1rem' : '1.2rem'} $fontWeight={700} $letterSpacing="0.35rem">
                        LEARN MORE
                    </Text>
                    <HaiArrow direction="right" strokeWidth={2.5} />
                </CenteredFlex>
            </Link>
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
    width: min(calc(100vw - 72px), 400px);
    height: 500px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;
    /* background-color: #f1f1fb77; */
    /* backdrop-filter: blur(13px); */
    background-color: rgba(255, 255, 255, 0.5);
    padding: 48px 36px;
    transition: all 0.5s ease;

    & svg {
        width: auto;
        height: 1.2rem;
    }

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        padding: 36px;
        height: max(400px, min(420px, 65vh));
    `}
`

const HiddenSEOText = styled(Text)`
    display: none !important;
`
