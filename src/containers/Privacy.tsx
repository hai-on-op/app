import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { BlurContainer, Flex, Text } from '~/styles'
import { BrandedTitle } from '~/components/BrandedTitle'

export function Privacy() {
    const isUpToSmall = useMediaQuery('upToSmall')
    return (
        <Container>
            <Header>
                <BrandedTitle textContent="PRIVACY POLICY" $fontSize={isUpToSmall ? '2.4rem' : '3rem'} />
            </Header>
            <Content>
                <Text>This is a placeholder : )</Text>
                <Text>
                    Your privacy is important to us. Please hold the line for the next available representative.
                </Text>
            </Content>
        </Container>
    )
}

const Container = styled(BlurContainer)`
    width: 100%;
    margin-bottom: 48px;
    & > * {
        padding: 0px;
    }
`

const Header = styled(Flex).attrs((props) => ({
    $justify: 'space-between',
    $align: 'center',
    $gap: 24,
    ...props,
}))`
    position: relative;
    padding: 48px;
    border-bottom: ${({ theme }) => theme.border.medium};

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 24px;
    `}

    z-index: 1;
`

const Content = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'stretch',
    $gap: 24,
    ...props,
}))`
    padding: 48px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 24px;
    `}
`
