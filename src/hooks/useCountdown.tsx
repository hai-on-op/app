import { useEffect, useRef, useState } from 'react'

type CountdownOptions = {
    placeholder?: string
    onStart?: (secondsRemaining: number) => void
    onMinute?: (minutesRemaining: number) => void
    onHour?: (hoursRemaining: number) => void
    onEnd?: () => void
    endText?: string
}

const defaultOptions = {
    placeholder: '--:--:--',
}

export function useCountdown(target: number, el: HTMLElement | null | undefined, options: CountdownOptions = {}) {
    const optionsRef = useRef(options)
    optionsRef.current = options
    const [countdownText, setCountdownText] = useState(options.placeholder || defaultOptions.placeholder)

    useEffect(() => {
        let hasStarted = false
        const int: any = setInterval(() => {
            const diff = Math.max(Math.floor(target - Date.now() / 1000), 0)
            if (!hasStarted) {
                hasStarted = true
                optionsRef.current.onStart?.(diff)
            }
            if (optionsRef.current.onMinute && diff % 60 === 0) {
                optionsRef.current.onMinute(Math.floor(diff / 60))
            }
            if (optionsRef.current.onHour && diff % 3600 === 0) {
                optionsRef.current.onHour(Math.floor(diff / 3600))
            }
            if (diff === 0) {
                setCountdownText(optionsRef.current.endText || '00:00:00')
                optionsRef.current.onEnd?.()
                return clearInterval(int)
            }
            setCountdownText(formatTimer(diff))
        }, 1000)

        return () => clearInterval(int)
    }, [target])

    if (el) el.textContent = countdownText

    return countdownText
}

export const padZero = (number: number, places = 2) => {
    const str = Math.round(Math.abs(number)).toString()

    return str.length >= places ? str : `${'0'.repeat(places - str.length)}${str}`
}

export const formatTimer = (timer: number, maxUnit: 'days' | 'hours' | 'minutes' = 'days') => {
    const seconds = timer % 60
    const minutes = Math.floor(timer / 60) % 60
    if (maxUnit === 'minutes') return `${minutes}:${padZero(seconds)}`

    const hours = Math.floor(timer / (60 * 60)) % 24
    if (maxUnit === 'hours') return `${hours}:${padZero(minutes)}:${padZero(seconds)}`

    const days = Math.floor(timer / (24 * 60 * 60))
    return `${days > 0 ? `${days}:` : ''}${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`
}
