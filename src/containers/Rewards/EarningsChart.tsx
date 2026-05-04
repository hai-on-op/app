import { useCallback, useMemo, useRef } from 'react'

import { Timeframe } from '~/utils'
import type { UserDailyEntry } from './index'
import { getTokenColor } from './utils'

import styled from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'
import { LineChart } from '~/components/Charts/Line'
import { Legend } from '~/components/Charts/Legend'
import { Section, SectionHeader } from './index'

type Props = {
    userDailyData: UserDailyEntry[]
    onDayClick?: (date: string) => void
}

export function EarningsChart({ userDailyData, onDayClick }: Props) {
    const containerRef = useRef<HTMLDivElement>(null)

    const chartData = useMemo(() => {
        // Discover all tokens dynamically from the data
        const tokenSet = new Set<string>()
        for (const { userData } of userDailyData) {
            for (const token of Object.keys(userData.dailyEarned)) {
                tokenSet.add(token)
            }
        }
        const tokens = Array.from(tokenSet)

        return tokens.map((token) => ({
            id: token,
            color: getTokenColor(token),
            data: userDailyData.map(({ dayReport, userData }) => ({
                x: new Date(dayReport.date),
                y: userData.dailyEarned[token] || 0,
            })),
        }))
    }, [userDailyData])

    const dates = useMemo(() => userDailyData.map((d) => d.dayReport.date), [userDailyData])

    const handleChartClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!onDayClick || !containerRef.current || dates.length === 0) return

            const rect = containerRef.current.getBoundingClientRect()
            // Nivo uses margin left=0 and right=0, so the chart spans full width
            const fraction = (e.clientX - rect.left) / rect.width
            const index = Math.round(fraction * (dates.length - 1))
            const clampedIndex = Math.max(0, Math.min(dates.length - 1, index))
            onDayClick(dates[clampedIndex])
        },
        [onDayClick, dates]
    )

    if (userDailyData.length === 0) return null

    return (
        <Section>
            <Flex $width="100%" $justify="space-between" $align="flex-end">
                <SectionHeader>DAILY EARNINGS</SectionHeader>
                {onDayClick && (
                    <Text $fontSize="0.75rem" style={{ opacity: 0.4 }}>
                        Click chart to view day details
                    </Text>
                )}
            </Flex>
            <ChartContainer ref={containerRef} $clickable={!!onDayClick} onClick={handleChartClick}>
                <LineChart
                    data={chartData}
                    timeframe={Timeframe.ONE_MONTH}
                    axisRight={{
                        tickSize: 0,
                        tickValues: 5,
                        tickPadding: -50,
                        format: (value) => {
                            const num = parseFloat(value.toString())
                            if (num >= 1) return num.toFixed(1)
                            if (num >= 0.01) return num.toFixed(3)
                            return num.toFixed(5)
                        },
                    }}
                />
                <Legend data={chartData} />
            </ChartContainer>
        </Section>
    )
}

const ChartContainer = styled(CenteredFlex)<{ $clickable?: boolean }>`
    position: relative;
    width: 100%;
    height: 260px;
    border-radius: 24px;
    overflow: visible;
    background: ${({ theme }) => theme.colors.gradientCool};
    cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};

    & svg {
        overflow: visible;
    }

    z-index: 2;
`
