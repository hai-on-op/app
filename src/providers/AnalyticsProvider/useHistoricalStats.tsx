import { Dispatch, SetStateAction, useMemo, useState } from 'react'
import { type QueryResult, useQuery } from '@apollo/client'

import {
    DAILY_STATS_QUERY,
    HOURLY_STATS_QUERY,
    ONE_DAY_MS,
    type QueryHistoricalStat,
    Timeframe,
} from '~/utils'

export type StatsQueryResult = {
    hourlyStats?: QueryHistoricalStat[],
    dailyStats?: QueryHistoricalStat[]
}

export type HistoricalStatsReturn = {
    timeframe: Timeframe,
    setTimeframe: Dispatch<SetStateAction<Timeframe>>,
    result: Pick<QueryResult<StatsQueryResult>, 'loading' | 'error' | 'data'>
}

export function useHistoricalStats(initialTimeframe = Timeframe.ONE_WEEK): HistoricalStatsReturn {
    const [timeframe, setTimeframe] = useState(initialTimeframe)

    const [query, since] = useMemo(() => {
        const now = Math.floor(Date.now() / 1000)
        switch(timeframe) {
            case Timeframe.ONE_DAY:
                return [HOURLY_STATS_QUERY, now - ONE_DAY_MS / 1000]
            case Timeframe.ONE_WEEK:
                return [DAILY_STATS_QUERY, now - 7 * ONE_DAY_MS / 1000]
            case Timeframe.ONE_MONTH:
                return [DAILY_STATS_QUERY, now - 30 * ONE_DAY_MS / 1000]
            case Timeframe.ONE_YEAR:
                // TODO: figure this out to avoid huge data payload
                return [DAILY_STATS_QUERY, now - 30 * ONE_DAY_MS / 1000]
        }
    }, [timeframe])

    const result = useQuery<StatsQueryResult>(query, { variables: { since } })

    return {
        timeframe,
        setTimeframe,
        result,
    }
}
