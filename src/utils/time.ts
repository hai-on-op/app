export const wait = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export const waitRandom = (min: number, max: number): Promise<void> => {
    return wait(min + Math.round(Math.random() * Math.max(0, max - min)))
}

export const timeout = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export const ONE_MINUTE_MS = 60 * 1000
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS
export const ONE_DAY_MS = 24 * ONE_HOUR_MS

export function parseRemainingTime(ms: number) {
    if (ms <= 0)
        return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
        }
    const days = Math.floor(ms / ONE_DAY_MS)
    const hours = Math.floor((ms % ONE_DAY_MS) / ONE_HOUR_MS)
    const minutes = Math.floor((ms % ONE_HOUR_MS) / ONE_MINUTE_MS)
    const seconds = Math.floor((ms % ONE_MINUTE_MS) / 1000)

    return {
        days,
        hours,
        minutes,
        seconds,
    }
}

export enum Timeframe {
    ONE_DAY,
    ONE_WEEK,
    ONE_MONTH,
    ONE_YEAR,
}
