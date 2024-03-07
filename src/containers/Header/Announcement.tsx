import { useState } from 'react'

import { useCountdown } from '~/hooks'

import styled, { css } from 'styled-components'
import { CenteredFlex, Text } from '~/styles'
import { Link } from '~/components/Link'
import { ArrowUpRight } from 'react-feather'

const airdropTarget = new Date('February 13 2024 00:00:00 UTC').getTime() / 1000
export function Announcement() {
    const [airdropLive, setAirdropLive] = useState(false)

    const [el, setEl] = useState<HTMLElement | null>(null)
    useCountdown(airdropTarget, el, {
        endText: 'Airdrop is live!',
        onEnd: () => setAirdropLive(true),
    })

    return (
        <Container>
            <CenteredFlex $gap={4}>
                {!airdropLive && <Text>Airdrop live in</Text>}
                <CountdownText ref={setEl} $live={airdropLive}>
                    --:--:--
                </CountdownText>
                <Link href="https://gov.letsgethai.com/dao/claim">
                    <CenteredFlex $gap={4}>
                        <Text>{airdropLive ? 'Claim Now' : 'Learn More'}</Text>
                        <ArrowUpRight size={18} />
                    </CenteredFlex>
                </Link>
            </CenteredFlex>
        </Container>
    )
}

const Container = styled(CenteredFlex)`
    width: 100%;
    height: 100%;
    font-weight: 700;
    background: ${({ theme }) => theme.colors.yellowish};
    /* text-transform: uppercase; */
    letter-spacing: 0.05em;
    white-space: nowrap;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        font-size: ${theme.font.small};
    `}
`

const CountdownText = styled(Text)<{ $live: boolean }>`
    min-width: 100px;
    ${({ $live }) =>
        $live &&
        css`
            margin-right: 8px;
        `}

    ${({ theme }) => theme.mediaWidth.upToSmall`
        min-width: 89px;
    `}
`
