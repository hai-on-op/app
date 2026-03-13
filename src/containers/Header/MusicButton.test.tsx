import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'

import { darkTheme } from '~/styles/themes'

const { resetMusicState, setResetMusicState } = vi.hoisted(() => {
    let reset = (_value = false) => undefined

    return {
        resetMusicState: (value = false) => reset(value),
        setResetMusicState: (nextReset: typeof reset) => {
            reset = nextReset
        },
    }
})

vi.mock('react-youtube', () => ({
    default: () => <div data-testid="youtube-player" />,
}))

vi.mock('~/store', async () => {
    const React = await import('react')

    let isPlayingMusic = false
    const listeners = new Set<VoidFunction>()

    const notify = () => {
        listeners.forEach((listener) => listener())
    }

    const setIsPlayingMusic = (value: boolean) => {
        isPlayingMusic = value
        notify()
    }

    setResetMusicState((value = false) => {
        isPlayingMusic = value
        notify()
    })

    return {
        useStoreState: (selector: (state: any) => unknown) => {
            const [, forceRender] = React.useState(0)

            React.useEffect(() => {
                const listener = () => forceRender((value) => value + 1)
                listeners.add(listener)
                return () => listeners.delete(listener)
            }, [])

            const state = {
                settingsModel: {
                    isPlayingMusic,
                },
            }

            return selector(state)
        },
        useStoreActions: (selector: (actions: any) => unknown) =>
            selector({
                settingsModel: {
                    setIsPlayingMusic,
                },
            }),
    }
})

import { MusicButton } from './MusicButton'

describe('MusicButton', () => {
    beforeEach(() => {
        localStorage.clear()
        resetMusicState(false)
    })

    it('does not mount the youtube player until the user explicitly enables music', async () => {
        render(
            <ThemeProvider theme={darkTheme}>
                <MusicButton />
            </ThemeProvider>
        )

        expect(screen.queryByTestId('youtube-player')).toBeNull()

        screen.getByRole('button', { name: 'Toggle Music' }).click()

        expect(await screen.findByTestId('youtube-player')).not.toBeNull()
    })
})
