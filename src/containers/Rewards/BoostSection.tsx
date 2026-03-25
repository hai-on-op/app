import type { AggregatedUser } from './types'
import { formatBoost, formatRewardAmount, formatShare, getBoostColor, BOOST_KEY_LABELS } from './utils'

import styled from 'styled-components'
import { DashedContainerStyle, type DashedContainerProps, Flex, Text } from '~/styles'
import { Section, SectionHeader } from './index'

type Props = {
    user: AggregatedUser
}

export function BoostSection({ user }: Props) {
    const boostEntries = Object.entries(user.avgBoosts).filter(([, v]) => v > 0)

    if (boostEntries.length === 0) return null

    return (
        <Section>
            <SectionHeader>BOOST OVERVIEW (30-DAY AVG)</SectionHeader>
            <BoostContainer $borderOpacity={0.2}>
                {boostEntries.map(([key, value]) => (
                    <BoostRow key={key}>
                        <BoostLabel>
                            <Text $fontWeight={600} $fontSize="0.9rem">
                                {BOOST_KEY_LABELS[key] || key}
                            </Text>
                            <Text $fontWeight={700} $fontSize="0.9rem" $color={getBoostColor(value)}>
                                {formatBoost(value)}
                            </Text>
                        </BoostLabel>
                        <BarTrack>
                            <BarFill $width={Math.max(0, (value - 1)) * 100} $color={getBoostColor(value)} />
                        </BarTrack>
                    </BoostRow>
                ))}

                <Flex $width="100%" $justify="flex-start" $gap={24} $flexWrap style={{ marginTop: 8 }}>
                    <Flex $gap={8} $align="center">
                        <Text $fontSize="0.8rem" $fontWeight={600} style={{ opacity: 0.6 }}>
                            KITE Staked:
                        </Text>
                        <Text $fontSize="0.9rem" $fontWeight={700}>
                            {formatRewardAmount(user.avgKiteStaked)}
                        </Text>
                    </Flex>
                    <Flex $gap={8} $align="center">
                        <Text $fontSize="0.8rem" $fontWeight={600} style={{ opacity: 0.6 }}>
                            KITE Share:
                        </Text>
                        <Text $fontSize="0.9rem" $fontWeight={700}>
                            {formatShare(user.avgKiteShare)}
                        </Text>
                    </Flex>
                </Flex>
            </BoostContainer>
        </Section>
    )
}

const BoostContainer = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $gap: 12,
    ...props,
}))<DashedContainerProps>`
    ${DashedContainerStyle}
    padding: 24px;

    &::after {
        opacity: 0.2;
    }
`

const BoostRow = styled(Flex).attrs({
    $width: '100%',
    $column: true,
    $gap: 6,
})``

const BoostLabel = styled(Flex).attrs({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
})``

const BarTrack = styled.div`
    width: 100%;
    height: 8px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.08);
    overflow: hidden;
`

const BarFill = styled.div<{ $width: number; $color: string }>`
    height: 100%;
    width: ${({ $width }) => Math.min($width, 100)}%;
    border-radius: 4px;
    background: ${({ $color }) => $color};
    transition: width 0.3s ease;
`
