import { useEffect, useMemo, useState } from 'react'

import type { RewardsReport, AggregatedUser, DailyReport, DailyUserData } from './types'

import styled from 'styled-components'
import { BlurContainer, Flex, type FlexProps, FlexStyle, Text } from '~/styles'
import { BrandedTitle } from '~/components/BrandedTitle'
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

export function RewardsAnalytics() {
    const [report, setReport] = useState<RewardsReport | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchAddress, setSearchAddress] = useState('')

    useEffect(() => {
        fetch('/reports/rewards-report.json')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load rewards report')
                return res.json()
            })
            .then((data: RewardsReport) => {
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

    if (loading) {
        return (
            <Container>
                <Section>
                    <BrandedTitle textContent="REWARDS ANALYTICS" $fontSize="3rem" />
                    <Text $fontSize="1rem">Loading rewards data...</Text>
                </Section>
            </Container>
        )
    }

    if (error || !report) {
        return (
            <Container>
                <Section>
                    <BrandedTitle textContent="REWARDS ANALYTICS" $fontSize="3rem" />
                    <Text $fontSize="1rem" $color="#ef4444">
                        {error || 'No rewards data available'}
                    </Text>
                </Section>
            </Container>
        )
    }

    return (
        <Container>
            <Section>
                <BrandedTitle textContent="REWARDS ANALYTICS" $fontSize="3rem" />
                <AddressSearch value={searchAddress} onChange={setSearchAddress} hasMatch={hasMatch} />
            </Section>

            <GlobalOverview report={report} />

            {matchedUser && (
                <>
                    <UserHeroStats user={matchedUser} totalDays={report.totalDaysWithData} />
                    <EarningsChart userDailyData={userDailyData} />
                    <StrategyBreakdown user={matchedUser} />
                    <BoostSection user={matchedUser} />
                    <DailyDetailList userDailyData={userDailyData} />
                </>
            )}
        </Container>
    )
}

const Container = styled(BlurContainer).attrs((props) => ({
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
