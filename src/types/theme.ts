import { type FlattenSimpleInterpolation, type DefaultTheme, type ThemedCssFunction } from 'styled-components'

export type IColors = {
    primary: string
    secondary: string
    gradient: string
    gradientSecondary: string
    gradientCool: string
    gradientCooler: string
    neutral: string
    background: string
    overlay: string
    border: string
    foreground: string
    dangerColor: string
    dangerBackground: string
    dangerBorder: string
    alertColor: string
    alertBackground: string
    alertBorder: string
    successColor: string
    successBackground: string
    successBorder: string
    warningColor: string
    warningBackground: string
    warningBorder: string
    placeholder: string
    inputBorderColor: string
    boxShadow: string
    customSecondary: string
    greenish: string
    blueish: string
    yellowish: string
    pinkish: string
    orangeish: string
    reddish: string
    dimmedColor: string
    dimmedBackground: string
    dimmedBorder: string
    colorPrimary: string
    colorSecondary: string
}

export type IFonts = {
    extraSmall: string
    small: string
    default: string
    medium: string
    large: string
    extraLarge: string
}

export type IBorders = {
    thin: string
    medium: string
    thick: string
    dashedImage: FlattenSimpleInterpolation
}

export type IGlobal = {
    gridMaxWidth: string
    borderRadius: string
    extraCurvedRadius: string
    buttonPadding: string
    modalWidth: string
}

export type IMediaWidth = {
    upToExtraSmall: ThemedCssFunction<DefaultTheme>
    upToSmall: ThemedCssFunction<DefaultTheme>
    upToMedium: ThemedCssFunction<DefaultTheme>
    upToLarge: ThemedCssFunction<DefaultTheme>
}

export type Theme = {
    colors: IColors
    font: IFonts
    border: IBorders
    global: IGlobal
    mediaWidth: IMediaWidth
}
