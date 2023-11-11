import styled from 'styled-components'
import { DashedContainerStyle, Flex, HaiButton, Text } from '~/styles'
import { ExternalLink } from '~/components/ExternalLink'
import { FloatingElements, FloatingElementsProps } from '~/components/FloatingElements'
import { TOKEN_LOGOS } from '~/utils'

type EarnStrategyProps = {
    heading: string,
    status?: string,
    description: string,
    cta?: string,
    ctaLink: string,
    tokenImages: ('KITE' | keyof typeof TOKEN_LOGOS)[],
    bgVariant?: number
}
export function EarnStrategy({
    heading,
    status = 'NOW LIVE',
    description,
    cta = 'Get HAI to Earn',
    ctaLink,
    tokenImages,
    bgVariant = 0
}: EarnStrategyProps) {
    const { clouds = [], coins = [] } = backgroundElementTransforms[
        bgVariant % backgroundElementTransforms.length
    ]

    return (
        <Container>
            <FloatingContainer>
                <FloatingElements
                    clouds={clouds}
                    coins={coins.map((coin, i) => ({
                        ...coin,
                        index: tokenImages[i % tokenImages.length]
                    }))}
                />
            </FloatingContainer>
            <Flex
                $column
                $justify="center"
                $align="flex-start"
                $gap={12}>
                <Header>
                    <Text $fontWeight={700}>{heading}</Text>
                    <Text>{status}</Text>
                </Header>
                <Text $fontSize="0.8rem">{description}</Text>
            </Flex>
            <ExternalLink
                href={ctaLink}
                $textDecoration="none">
                <HaiButton $variant="yellowish">
                    <Text>{cta}</Text>
                </HaiButton>
            </ExternalLink>
        </Container>
    )
}

const Container = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 24,
    ...props
}))`
    ${DashedContainerStyle}
    padding: 36px;
    overflow: hidden;
`
const FloatingContainer = styled.div`
    position: absolute;
    inset: 0px;
    z-index: -1;
`

const Header = styled(Flex).attrs(props => ({
    $justify: 'flex-start',
    $align: 'center',
    $gap: 12,
    ...props
}))`
    font-size: 1.6rem;
    letter-spacing: 0.4rem;
`

const backgroundElementTransforms: Pick<FloatingElementsProps, 'clouds' | 'coins'>[] = [
    {
        clouds: [
            {
                index: 0,
                width: '160px',
                style: {
                    right: '80px',
                    bottom: '-60px'
                },
                zIndex: 1
            },
            {
                index: 0,
                width: '80px',
                style: {
                    right: '320px',
                    top: '-30px'
                },
                zIndex: 1
            }
        ],
        coins: [
            {
                index: 0,
                width: '120px',
                style: {
                    right: '260px',
                    bottom: '-30px'
                },
                rotation: -30,
                thickness: 10,
                zIndex: 2
            },
            {
                index: 0,
                width: '80px',
                style: {
                    right: '-20px',
                    bottom: 'calc(50% - 40px)'
                },
                rotation: 45,
                thickness: 8,
                zIndex: 0
            }
        ]
    }
]