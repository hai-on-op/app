import styled from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'
import { ZoomScene } from './ZoomScene'
import { BrandedTitle } from '~/components/BrandedTitle'

export function Third({ ...props }) {
    return (
        <ZoomScene {...props}>
            <Container>
                <LearnCard title="BORROW HAI TO MULTIPLY YOUR CRYPTO EXPOSURE"/>
                <LearnCard title="COLLECT MONTHLY REWARDS FOR PROVIDING LIQUIDITY"/>
                <LearnCard title="ACQUIRE LIQUIDATED ASSETS"/>
                {/* <LearnCard title="BORROW HAI TO MULTIPLY YOUR CRYPTO EXPOSURE"/> */}
            </Container>
        </ZoomScene>
    )
}

const Container = styled(Flex).attrs(props => ({
    $justify: 'flex-start',
    $align: 'center',
    $gap: 24,
    ...props
}))`
    max-width: 100vw;
    padding: 12px 48px;
    margin-top: 100px;
    overflow: auto;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
`

const LearnCardContainer = styled(Flex).attrs(props => ({
    $column: true,
    $justify: 'space-between',
    $align: 'flex-start',
    $shrink: 0,
    ...props
}))`
    width: min(calc(100vw - 48px), 400px);
    height: 500px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;
    background-color: #f1f1fb77;
    padding: 48px;
`

function LearnCard({ title }: { title: string }) {
    return (
        <LearnCardContainer>
            <CenteredFlex $gap={12}>
                <Text
                    $fontWeight={700}
                    $letterSpacing="0.1rem">
                    LEARN
                </Text>
            </CenteredFlex>
            <BrandedTitle
                textContent={title}
                $fontSize="2.5rem"
                $lineHeight="3.6rem"
            />
        </LearnCardContainer>
    )
}