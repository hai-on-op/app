const ONE_MINUTE_IN_MS = 60 * 1000
const ONE_HOUR_IN_MS = 60 * ONE_MINUTE_IN_MS
const ONE_DAY_IN_MS = 24 * ONE_HOUR_IN_MS

export function parseRemainingTime(ms: number) {
    if (ms <= 0) return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    }
    const days = Math.floor(ms / ONE_DAY_IN_MS)
    const hours = Math.floor((ms % ONE_DAY_IN_MS) / ONE_HOUR_IN_MS)
    const minutes = Math.floor((ms % ONE_HOUR_IN_MS) / ONE_MINUTE_IN_MS)
    const seconds = Math.floor((ms % ONE_MINUTE_IN_MS) / 1000)

    return {
        days,
        hours,
        minutes,
        seconds
    }
}