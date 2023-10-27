import styled from 'styled-components'
import { Flex, HaiButton } from '~/styles'
import { ZoomScene } from './ZoomScene'
import { BrandedTitle } from '~/components/BrandedTitle'
import Swirl from '~/components/Icons/Swirl'
import { PairsBanner } from '../PairsBanner'

export function Intro({ ...props }) {
    return (
        <ZoomScene {...props}>
            <Container>
                <BrandedTitle
                    textContent="GET $HAI ON YOUR OWN SUPPLY."
                    $fontSize="6rem"
                    $letterSpacing="1.2rem"
                />
                <HaiButton $variant="yellowish">
                    <Swirl/>
                    SCROLL TO EXPLORE
                </HaiButton>
            </Container>
            <PairsBanner/>
        </ZoomScene>
    )
}

const Container = styled(Flex).attrs(props => ({
    $column: true,
    $justify: 'center',
    $align: 'flex-start',
    $gap: 48,
    ...props
}))`
    max-width: 900px;
`