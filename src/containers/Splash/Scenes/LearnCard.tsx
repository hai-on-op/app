import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'
import RightArrow from '~/components/Icons/RightArrow'
import { ExternalLink } from '~/components/ExternalLink'
import { BrandedTitle } from '~/components/BrandedTitle'

type LearnCardProps = {
    title: string,
    link: string,
    titleColorOffset?: number
}
export function LearnCard({ title, link, titleColorOffset }: LearnCardProps) {
    const isLargerThanExtraSmall = useMediaQuery('upToExtraSmall')

    return (
        <Container>
            <Flex
                $column
                $gap={24}>
                <BrandedTitle
                    textContent={title}
                    $fontSize={isLargerThanExtraSmall ? '2.2rem': '1.9rem'}
                    $letterSpacing="0.4rem"
                    $lineHeight="1.4"
                    colorOffset={titleColorOffset}
                />
            </Flex>
            <ExternalLink
            href={link}
            $textDecoration="none">
            <CenteredFlex $gap={12}>
                <Text
                    $fontSize={isLargerThanExtraSmall ? '1.2rem': '1rem'}
                    $fontWeight={700}
                    $letterSpacing="0.35rem">
                    LEARN MORE
                </Text>
                <RightArrow/>
            </CenteredFlex>
            </ExternalLink>
        </Container>
    )
}

const Container = styled(Flex).attrs(props => ({
    $column: true,
    $justify: 'space-between',
    $align: 'flex-start',
    $shrink: 0,
    ...props
}))`
    position: relative;
    width: min(calc(100vw - 48px), 400px);
    height: 500px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;
    /* background-color: #f1f1fb77; */
    /* backdrop-filter: blur(13px); */
    background-color: rgba(255,255,255,0.5);
    padding: 48px 36px;
    transition: all 0.5s ease;

    & svg {
        width: auto;
        height: 1rem;
    }

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        padding: 36px;
        height: max(400px, min(420px, 65vh));
    `}
`
