import { useEffect, useState } from 'react'

import type { ReactChildren, TokenKey } from '~/types'
import { TOKEN_LOGOS } from '~/utils'
import { useStoreState } from '~/store'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'
import { Tooltip } from './Tooltip'

type TokenPairProps = {
    tokens: [TokenKey] | [TokenKey, TokenKey]
    size?: number
    hideLabel?: boolean
}
export function TokenPair({ tokens, size = 64, hideLabel = false }: TokenPairProps) {
    return (
        <Flex $align="center" $gap={12} $grow={0}>
            <IconContainer $size={size}>
                {tokens.map((token, i) => (
                    <img
                        key={i}
                        src={TOKEN_LOGOS[token]}
                        alt={token}
                        width={48}
                        height={48}
                        className={`token-${token}`}
                    />
                ))}
            </IconContainer>
            {!hideLabel && (
                <Text $fontWeight={700}>{tokens.length === 1 ? tokens[0] : `${tokens[0]}/${tokens[1]}`}</Text>
            )}
        </Flex>
    )
}

const IconContainer = styled(CenteredFlex)<{ $size?: number; $isKite?: boolean }>`
    width: fit-content;

    & > * {
        width: ${({ $size = 64 }) => $size / 2}px;
        height: ${({ $size = 64 }) => $size / 2}px;
        border-radius: 50%;
        border: ${({ theme }) => theme.border.thin};
        background-color: ${({ theme }) => theme.colors.greenish};

        &.token-KITE {
            background-color: #eecabc;
        }

        &:nth-child(2) {
            margin-left: -${({ $size = 64 }) => 0.16 * $size}px;
        }
    }
    & svg {
        width: 70%;
        height: auto;
    }
`

type RewardsPairProps = TokenPairProps & {
    tooltip?: ReactChildren
}
export function RewardsTokenPair({ tokens, hideLabel = false, tooltip }: RewardsPairProps) {
    return (
        <RewardsContainer $pad={!hideLabel} $gap={8} $grow={0}>
            <TokenPair tokens={tokens} size={36} hideLabel />
            {!hideLabel && <Text $fontWeight={700}>REWARDS</Text>}
            {!!tooltip && <Tooltip>{tooltip}</Tooltip>}
        </RewardsContainer>
    )
}

const RewardsContainer = styled(CenteredFlex)<{ $pad?: boolean }>`
    height: 36px;
    padding: 6px 10px;
    ${({ $pad = false }) =>
        $pad &&
        css`
            padding-right: 12px;
        `}
    border-radius: 999px;
    background-color: white;
`

export function CyclingTokenIcons({ size = 32 }: { size?: number }) {
    const {
        connectWalletModel: { tokensData },
    } = useStoreState((state) => state)

    const [currentIcon, setCurrentIcon] = useState<string>()

    useEffect(() => {
        const tokens = Object.values(tokensData || {})
            .filter(({ isCollateral }) => isCollateral)
            .map((data) => data.symbol)
        if (!tokens.length) return

        let index = 0
        const int = setInterval(() => {
            index = (index + 1) % tokens.length
            setCurrentIcon(tokens[index])
        }, 1000)

        return () => clearInterval(int)
    }, [tokensData])

    return (
        <CyclingContainer $size={size}>
            <img src={TOKEN_LOGOS[(currentIcon || 'HAI') as TokenKey]} alt="" />
        </CyclingContainer>
    )
}

const CyclingContainer = styled(CenteredFlex)<{ $size: number }>`
    width: ${({ $size }) => $size}px;
    height: ${({ $size }) => $size}px;
    border-radius: 50%;
    flex-shrink: 0;
    border: ${({ theme }) => theme.border.medium};
    background-color: ${({ theme }) => theme.colors.greenish};
    overflow: hidden;

    & > img {
        width: ${({ $size }) => $size}px;
        height: ${({ $size }) => $size}px;
    }
`
