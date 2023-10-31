import { TOKEN_LOGOS } from '~/utils'

import styled, { keyframes } from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'
import HaiFace from '~/components/Icons/HaiFace'

const pairs = Object.entries(TOKEN_LOGOS).reduce((arr, [ticker, logo]) => {
    if (ticker.toLowerCase() !== 'hai') arr.push([ticker, logo])
    return arr
}, [] as [string, string][])
const doubledPairs = [ ...pairs, ...pairs ]

export function PairsBanner() {

	return (
		<Container>
            <Inner>
                {doubledPairs.map(([ticker, logo], i) => (
                    <Pair key={i}>
                        <IconContainer>
                            <img
                                src={logo}
                                alt="HAI"
                                width={48}
                                height={48}
                            />
                            <CenteredFlex>
                                <HaiFace filled/>
                            </CenteredFlex>
                        </IconContainer>
                        <Text $fontWeight={900}>{ticker} / HAI</Text>
                    </Pair>
                ))}
            </Inner>
        </Container>
	)
}

const rightToLeft = keyframes`
    0% { left: 0px; }
    100% { left: ${-(240 + 24) * pairs.length}px; }
`

const Container = styled(Flex).attrs(props => ({
    $justify: 'flex-start',
    $align: 'center',
    ...props
}))`
    position: absolute;
    left: 0px;
    right: 0px;
    bottom: 24px;
    height: 80px;
    overflow: visible;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        height: 60px;
        bottom: 12px;
    `}
`
const Inner = styled(Flex).attrs(props => ({
    $justify: 'flex-start',
    $align: 'center',
    $gap: 24,
    ...props
}))`
    position: absolute;
    left: 0%;
    animation: ${rightToLeft} 40s linear infinite;
    width: ${(240 + 24) * pairs.length}px;
`
const Pair = styled(Flex).attrs(props => ({
    $justify: 'flex-start',
    $align: 'center',
    $gap: 12,
    $shrink: 0,
    ...props
}))`
    width: 240px;
    height: 80px;
    padding: 24px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 16px;
    /* backdrop-filter: blur(13px); */
    background-color: rgba(255,255,255,0.4);

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 12px;
        height: 60px;
    `}
`
const IconContainer = styled(CenteredFlex)`
    width: 64px;

    & > * {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: ${({ theme }) => theme.border.thin};
        background-color: ${({ theme }) => theme.colors.greenish};

        &:nth-child(2) {
            margin-left: -10px;
        }
    }
    & svg {
        width: 70%;
        height: auto;
    }
`