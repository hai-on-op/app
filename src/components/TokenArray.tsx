import type { ReactChildren, TokenKey } from '~/types'
import { TOKEN_LOGOS } from '~/utils'
import { useStoreState } from '~/store'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'
import { Tooltip } from './Tooltip'
import { IconCycler } from './Icons/IconCycler'

type TokenArrayProps = {
    tokens: (TokenKey | 'All' | 'Collateral')[]
    size?: number
    label?: string
    hideLabel?: boolean
}
export function TokenArray({ tokens, size = 32, label, hideLabel = false }: TokenArrayProps) {
    return (
        <Flex $align="center" $gap={12} $grow={0}>
            <IconContainer $size={size}>
                {tokens.map((token, i) => {
                    switch (token) {
                        case 'All':
                        case 'Collateral':
                            return <CyclingTokenArray key={i} size={size} includeProtocolTokens={token === 'All'} />
                        default:
                            return (
                                <img
                                    key={i}
                                    src={TOKEN_LOGOS[token]}
                                    alt={token}
                                    width={48}
                                    height={48}
                                    className={`token-${token}`}
                                />
                            )
                    }
                })}
            </IconContainer>
            {!hideLabel && tokens.length < 3 && (
                <Text $fontWeight={700}>
                    {label || (tokens.length === 1 ? tokens[0] : `${tokens[0]}/${tokens[1]}`)}
                </Text>
            )}
        </Flex>
    )
}

const IconContainer = styled(CenteredFlex)<{ $size: number; $isKite?: boolean }>`
    width: fit-content;

    & > * {
        width: ${({ $size }) => $size}px;
        height: ${({ $size }) => $size}px;
        border-radius: 50%;
        border: ${({ theme }) => theme.border.thin};
        background-color: ${({ theme }) => theme.colors.greenish};

        &.token-KITE {
            background-color: #eecabc;
        }

        &:not(:first-child) {
            margin-left: -${({ $size }) => 0.32 * $size}px;
        }
    }
    & svg {
        width: 70%;
        height: auto;
    }
`

type RewardsArrayProps = TokenArrayProps & {
    tooltip?: ReactChildren
}
export function RewardsTokenArray({
    tokens,
    size = 18,
    label = 'REWARDS',
    hideLabel = false,
    tooltip,
}: RewardsArrayProps) {
    return (
        <RewardsContainer $pad={!hideLabel} $gap={8} $grow={0}>
            <TokenArray tokens={tokens} size={size} hideLabel />
            {!hideLabel && <Text $fontWeight={700}>{label}</Text>}
            {!!tooltip && <Tooltip width="200px">{tooltip}</Tooltip>}
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

type CyclingTokenArrayProps = {
    size?: number
    tokens?: TokenKey[]
    includeProtocolTokens?: boolean
}
export function CyclingTokenArray({ size = 32, tokens, includeProtocolTokens = false }: CyclingTokenArrayProps) {
    const {
        connectWalletModel: { tokensData },
    } = useStoreState((state) => state)

    const icons = tokens
        ? tokens.map((token) => ({
              icon: TOKEN_LOGOS[token],
              bg: token === 'KITE' ? '#eecabc' : 'greenish',
          }))
        : Object.values(tokensData || {})
              .filter(({ isCollateral }) => includeProtocolTokens || isCollateral)
              .map(({ symbol }) => ({
                  icon: TOKEN_LOGOS[symbol as TokenKey],
                  bg: symbol === 'KITE' ? '#eecabc' : 'greenish',
              }))

    return <IconCycler size={size} icons={icons} />
}
