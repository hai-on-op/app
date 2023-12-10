import { TOKEN_LOGOS } from '~/utils'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'

type TokenKey = keyof typeof TOKEN_LOGOS
type TokenPairProps = {
    tokens: [TokenKey] | [TokenKey, TokenKey],
    size?: number,
    hideLabel?: boolean,
}
export function TokenPair({ tokens, size = 64, hideLabel = false }: TokenPairProps) {
    return (
        <Flex
            $align="center"
            $gap={12}
            $grow={0}>
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
            {!hideLabel && <Text $fontWeight={700}>{tokens[0]}/{tokens[1]}</Text>}
        </Flex>
    )
}

const IconContainer = styled(CenteredFlex)<{ $size?: number, $isKite?: boolean }>`
    width: fit-content;

    & > * {
        width: ${({ $size = 64 }) => $size / 2}px;
        height: ${({ $size = 64 }) => $size / 2}px;
        border-radius: 50%;
        border: ${({ theme }) => theme.border.thin};
        background-color: ${({ theme }) => theme.colors.greenish};

        &.token-KITE {
            background-color: #EECABC;
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

type RewardsPairProps = TokenPairProps
export function RewardsTokenPair({ tokens, hideLabel = false }: RewardsPairProps) {
    return (
        <RewardsContainer
            $pad={!hideLabel}
            $gap={8}
            $grow={0}>
            <TokenPair
                tokens={tokens}
                size={36}
                hideLabel
            />
            {!hideLabel && <Text $fontWeight={700}>REWARDS</Text>}
        </RewardsContainer>
    )
}

const RewardsContainer = styled(CenteredFlex)<{ $pad?: boolean }>`
    height: 36px;
    padding: 6px 10px;
    ${({ $pad = false }) => $pad && css`padding-right: 12px;`}
    border-radius: 999px;
    background-color: white;
`
