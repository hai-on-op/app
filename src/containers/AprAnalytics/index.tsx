import { useMemo, useState, useCallback } from 'react'
import { useApr } from '~/apr/AprProvider'

import styled from 'styled-components'
import { BlurContainer, Flex, Text } from '~/styles'
import { BrandedTitle } from '~/components/BrandedTitle'
import { NavContainer } from '~/components/NavContainer'
import { ProtocolOverview } from './ProtocolOverview'
import { StrategyTable } from './StrategyTable'
import { StrategyDetail } from './StrategyDetail'
import { BoostOverview } from './BoostOverview'

const TAB_ITEMS = ['Overview', 'Strategy Details']

export function AprAnalytics() {
    const { strategies, loading, error } = useApr()
    const [activeTab, setActiveTab] = useState(0)

    const strategyList = useMemo(() => Object.values(strategies), [strategies])

    const handleTabChange = useCallback((index: number) => {
        setActiveTab(index)
    }, [])

    if (loading) {
        return (
            <TopContainer>
                <Flex $column $gap={24} $width="100%" $justify="flex-start" $align="flex-start">
                    <BrandedTitle textContent="APR ANALYTICS" $fontSize="3rem" />
                    <Text $fontSize="1rem">Loading APR data...</Text>
                </Flex>
            </TopContainer>
        )
    }

    if (error) {
        return (
            <TopContainer>
                <Flex $column $gap={24} $width="100%" $justify="flex-start" $align="flex-start">
                    <BrandedTitle textContent="APR ANALYTICS" $fontSize="3rem" />
                    <Text $fontSize="1rem" $color="#ef4444">
                        {error}
                    </Text>
                </Flex>
            </TopContainer>
        )
    }

    if (strategyList.length === 0) {
        return (
            <TopContainer>
                <Flex $column $gap={24} $width="100%" $justify="flex-start" $align="flex-start">
                    <BrandedTitle textContent="APR ANALYTICS" $fontSize="3rem" />
                    <Text $fontSize="1rem" style={{ opacity: 0.6 }}>
                        Waiting for strategy data to load...
                    </Text>
                </Flex>
            </TopContainer>
        )
    }

    return (
        <Flex $width="100%" $column $gap={24}>
            <TopContainer>
                <Flex $column $gap={24} $width="100%" $justify="flex-start" $align="flex-start">
                    <BrandedTitle textContent="APR ANALYTICS" $fontSize="3rem" />
                    <Text $fontSize="0.9rem" style={{ opacity: 0.6 }}>
                        Real-time APR breakdown for all strategies. See how each APR is calculated, your positions,
                        boost multipliers, and estimated daily rewards.
                    </Text>
                </Flex>
            </TopContainer>

            <NavContainer
                navItems={TAB_ITEMS}
                selected={activeTab}
                onSelect={handleTabChange}
                stackHeader
            >
                {activeTab === 0 ? (
                    <Flex $width="100%" $column $gap={24}>
                        <ProtocolOverview strategies={strategyList} />
                        <StrategyTable strategies={strategyList} />
                        <BoostOverview strategies={strategyList} />
                    </Flex>
                ) : (
                    <Flex $width="100%" $column $gap={24}>
                        <StrategyDetail strategies={strategyList} />
                    </Flex>
                )}
            </NavContainer>
        </Flex>
    )
}

const TopContainer = styled(BlurContainer).attrs((props) => ({
    $width: '100%',
    $gap: 24,
    ...props,
}))`
    padding: 48px;
    & > * {
        padding: 0px;
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 24px;
    `}
`
