import { type ReactNode, createContext, useContext, useState } from 'react'

import type { SetState, Theme } from '~/types'

import { ThemeProvider } from 'styled-components'
import { darkTheme, lightTheme } from '~/styles/themes'

type HaiThemeContext = {
    themeId: 'dark' | 'light'
    theme: Theme
    toggleTheme: SetState<'dark' | 'light'>
}

const defaultState: HaiThemeContext = {
    themeId: 'dark',
    theme: darkTheme,
    toggleTheme: () => undefined,
}

const HaiThemeContext = createContext<HaiThemeContext>(defaultState)

export const useHaiTheme = () => useContext(HaiThemeContext)

type Props = {
    children: ReactNode | ReactNode[]
}
export function HaiThemeProvider({ children }: Props) {
    const [themeId, toggleTheme] = useState<HaiThemeContext['themeId']>(defaultState.themeId)

    const theme = themeId === 'dark' ? darkTheme : lightTheme

    return (
        <HaiThemeContext.Provider
            value={{
                themeId,
                theme,
                toggleTheme,
            }}
        >
            <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </HaiThemeContext.Provider>
    )
}
