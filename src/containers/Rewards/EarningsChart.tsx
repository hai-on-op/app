import { useMemo } from 'react'
import { Timeframe } from '~/utils'
import type { UserDailyEntry } from './index'

import styled from 'styled-components'
import { CenteredFlex } from '~/styles'
import { LineChart } from '~/components/Charts/Line'
import { Legend } from '~/components/Charts/Legend'
import { Section, SectionHeader } from './index'

type Props = {
    userDailyData: UserDailyEntry[]
}

export function EarningsChart({ userDailyData }: Props) {
    const chartData = useMemo(() => {
        const haiData = userDailyData.map(({ dayReport, userData }) => ({
            x: new Date(dayReport.date),
            y: userData.dailyEarned.HAI || 0,
        }))

        const kiteData = userDailyData.map(({ dayReport, userData }) => ({
            x: new Date(dayReport.date),
            y: userData.dailyEarned.KITE || 0,
        }))

        return [
            { id: 'HAI', color: '#22d3ee', data: haiData },
            { id: 'KITE', color: '#10b981', data: kiteData },
        ]
    }, [userDailyData])

    if (userDailyData.length === 0) return null

    return (
        <Section>
            <SectionHeader>DAILY EARNINGS</SectionHeader>
            <ChartContainer>
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

const ChartContainer = styled(CenteredFlex)`
    position: relative;
    width: 100%;
    height: 260px;
    border-radius: 24px;
    overflow: visible;
    background: ${({ theme }) => theme.colors.gradientCool};

    & svg {
        overflow: visible;
    }

    z-index: 2;
`
