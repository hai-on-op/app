import { useCallback, useEffect, useMemo, useState } from 'react'

import type { RewardsReport, AggregatedUser, DailyReport, DailyUserData } from './types'

import styled from 'styled-components'
import { BlurContainer, Flex, type FlexProps, FlexStyle, Text } from '~/styles'
import { BrandedTitle } from '~/components/BrandedTitle'
import { NavContainer } from '~/components/NavContainer'
import { AddressSearch } from './AddressSearch'
import { GlobalOverview } from './GlobalOverview'
import { UserHeroStats } from './UserHeroStats'
import { EarningsChart } from './EarningsChart'
import { StrategyBreakdown } from './StrategyBreakdown'
import { BoostSection } from './BoostSection'
import { DailyDetailList } from './DailyDetailList'

export type UserDailyEntry = {
    dayReport: DailyReport
    userData: DailyUserData
}

const TAB_ITEMS = ['Overview', 'Daily Details']

export function RewardsAnalytics() {
    const [report, setReport] = useState<RewardsReport | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchAddress, setSearchAddress] = useState('')
    const [activeTab, setActiveTab] = useState(0)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)

    useEffect(() => {
        fetch('http://143.198.123.60:3100/')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load rewards report')
                return res.json()
            })
            .then((data: RewardsReport) => {
                // Drop the latest day — it's still incomplete / one day ahead
                if (data.dailyReports && data.dailyReports.length > 1) {
                    data.dailyReports = data.dailyReports.slice(0, -1)
                }
                setReport(data)
                setLoading(false)
            })
            .catch((err) => {
                setError(err.message)
                setLoading(false)
            })
    }, [])

    const normalizedAddress = searchAddress.toLowerCase()

    const matchedUser: AggregatedUser | null = useMemo(() => {
        if (!report || !normalizedAddress) return null
        return report.users.find((u) => u.address === normalizedAddress) || null
    }, [report, normalizedAddress])

    const userDailyData: UserDailyEntry[] = useMemo(() => {
        if (!report || !normalizedAddress) return []
        return report.dailyReports
            .filter((day) => day.users[normalizedAddress])
            .map((day) => ({
                dayReport: day,
                userData: day.users[normalizedAddress],
            }))
    }, [report, normalizedAddress])

    const hasMatch = normalizedAddress.length === 42 ? matchedUser !== null : null

    const handleDayClick = useCallback(
        (date: string) => {
            setSelectedDate(date)
            setActiveTab(1)
        },
        []
    )

    // Clear selectedDate when switching tabs manually
    const handleTabChange = useCallback((index: number) => {
        setActiveTab(index)
        if (index === 0) setSelectedDate(null)
    }, [])

    if (loading) {
        return (
            <TopContainer>
                <Section>
                    <BrandedTitle textContent="REWARDS ANALYTICS" $fontSize="3rem" />
                    <Text $fontSize="1rem">Loading rewards data...</Text>
                </Section>
            </TopContainer>
        )
    }

    if (error || !report) {
        return (
            <TopContainer>
                <Section>
                    <BrandedTitle textContent="REWARDS ANALYTICS" $fontSize="3rem" />
                    <Text $fontSize="1rem" $color="#ef4444">
                        {error || 'No rewards data available'}
                    </Text>
                </Section>
            </TopContainer>
        )
    }

    return (
        <Flex $width="100%" $column $gap={24}>
            {/* Address search — always visible above tabs */}
            <TopContainer>
                <Section>
                    <BrandedTitle textContent="REWARDS ANALYTICS" $fontSize="3rem" />
                    <AddressSearch value={searchAddress} onChange={setSearchAddress} hasMatch={hasMatch} />
                </Section>
            </TopContainer>

            {/* Tabbed content */}
            <NavContainer
                navItems={matchedUser ? TAB_ITEMS : ['Overview']}
                selected={activeTab}
                onSelect={handleTabChange}
                stackHeader
            >
                {activeTab === 0 ? (
                    <Flex $width="100%" $column $gap={24}>
                        <GlobalOverview report={report} />
                        {matchedUser && (
                            <>
                                <UserHeroStats user={matchedUser} totalDays={report.totalDaysWithData} />
                                <EarningsChart userDailyData={userDailyData} onDayClick={handleDayClick} />
                                <StrategyBreakdown user={matchedUser} />
                                <BoostSection user={matchedUser} />
                            </>
                        )}
                    </Flex>
                ) : (
                    matchedUser && (
                        <DailyDetailList
                            userDailyData={userDailyData}
                            selectedDate={selectedDate}
                            onClearSelectedDate={() => setSelectedDate(null)}
                        />
                    )
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

export const Section = styled.section.attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 24,
    ...props,
}))<FlexProps>`
    ${FlexStyle}
`

export const SectionHeader = styled(Text).attrs((props) => ({
    $fontSize: '1.4rem',
    $fontWeight: 700,
    ...props,
}))``
