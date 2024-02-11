import merge from 'lodash.merge'
import { darkTheme as rainbowDarkTheme, type Theme as RainbowTheme } from '@rainbow-me/rainbowkit'

import type { Theme } from '~/types'
import { mediaWidthTemplates } from '~/utils'
import { css } from 'styled-components'

import dashedBorderImage from '~/assets/border-image.png'

export const darkTheme: Theme = {
    colors: {
        primary: '#000',
        secondary: '#A5A5A5',
        customSecondary: '#DADADA',
        gradient: 'linear-gradient(90deg, #F2D86A 0%, #FFC3AB 100%)',
        gradientSecondary: 'linear-gradient(90deg, #C0F3BB 0%, #F2D86A 100%)',
        gradientCool: 'linear-gradient(90deg, #BBCFDE 0%, #DFDAEC 100%)',
        gradientCooler: 'linear-gradient(90deg, #bbc2f0 0%, #FFC1F2 100%)',
        neutral: '#ffffff',
        background: '#eee6f7',
        overlay: 'rgba(0, 0, 0, 0.8)',
        greenish: '#c0f3bb',
        blueish: '#bbc2f0',
        yellowish: '#f2d86a',
        pinkish: '#ffc1f2',
        orangeish: '#ffc2ab',
        reddish: '#FF7878',
        border: '#08223E',
        foreground: '#05192e',
        dangerColor: '#e75966',
        dangerBackground: '#F8D7DA',
        dangerBorder: '#F5C6CB',
        alertColor: '#316398',
        alertBackground: '#CCE5FF',
        alertBorder: '#B8DAFF',
        successColor: '#00AC11',
        successBackground: '#D4EDDA',
        successBorder: '#C3E6CB',
        warningColor: '#856404',
        warningBackground: '#FFF3CD',
        warningBorder: '#856404',
        placeholder: '#05172B',
        inputBorderColor: '#6fbcdb',
        boxShadow: '#eef3f9',
        dimmedColor: '#ffffff',
        dimmedBackground: '#A4ABB7',
        dimmedBorder: '#878787',
        colorPrimary: '#05284C',
        colorSecondary: '#031A31',
    },
    font: {
        extraSmall: '12px',
        small: '14px',
        default: '16px',
        medium: '18px',
        large: '20px',
        extraLarge: '22px',
    },
    border: {
        thin: '1px solid black',
        medium: '2px solid black',
        thick: '3px solid black',
        dashedImage: css`
            border-style: dashed;
            border-image-source: url('${dashedBorderImage}');
            border-image-slice: 2;
            border-image-repeat: round;
        `,
    },
    global: {
        gridMaxWidth: '1454px',
        borderRadius: '4px',
        extraCurvedRadius: '20px',
        buttonPadding: '8px 16px',
        modalWidth: '720px',
    },
    mediaWidth: mediaWidthTemplates,
}

export const lightTheme: Theme = {
    colors: {
        primary: '#2A2A2A',
        secondary: '#A5A5A5',
        customSecondary: '#DADADA',
        gradient: 'linear-gradient(90deg, #F2D86A 0%, #FFC3AB 100%)',
        gradientSecondary: 'linear-gradient(90deg, #C0F3BB 0%, #F2D86A 100%)',
        gradientCool: 'linear-gradient(90deg, #BBCFDE 0%, #DFDAEC 100%)',
        gradientCooler: 'linear-gradient(90deg, #bbc2f0 0%, #FFC1F2 100%)',
        neutral: '#ffffff',
        background: '#eee6f7',
        overlay: 'rgba(0, 0, 0, 0.8)',
        greenish: '#c0f3bb',
        blueish: '#bbc2f0',
        yellowish: '#f2d86a',
        pinkish: '#ffc1f2',
        orangeish: '#ffc2ab',
        reddish: '#FF7878',
        border: '#08223E',
        foreground: '#05192e',
        dangerColor: '#e75966',
        dangerBackground: '#F8D7DA',
        dangerBorder: '#F5C6CB',
        alertColor: 'rgb(255,104,113)',
        alertBackground: '#CCE5FF',
        alertBorder: '#B8DAFF',
        successColor: '#00AC11',
        successBackground: '#D4EDDA',
        successBorder: '#C3E6CB',
        warningColor: '#856404',
        warningBackground: '#FFF3CD',
        warningBorder: '#856404',
        placeholder: '#031A31',
        inputBorderColor: '#6fbcdb',
        boxShadow: '#eef3f9',
        dimmedColor: '#ffffff',
        dimmedBackground: '#A4ABB7',
        dimmedBorder: '#878787',
        colorPrimary: '#05284C',
        colorSecondary: '031A31',
    },
    font: {
        extraSmall: '12px',
        small: '14px',
        default: '16px',
        medium: '18px',
        large: '20px',
        extraLarge: '22px',
    },
    border: {
        thin: '1px solid black',
        medium: '2px solid black',
        thick: '3px solid black',
        dashedImage: css`
            border-style: dashed;
            border-image-source: url('${dashedBorderImage}');
            border-image-slice: 2;
            border-image-repeat: round;
        `,
    },
    global: {
        gridMaxWidth: '1500px',
        borderRadius: '4px',
        extraCurvedRadius: '20px',
        buttonPadding: '8px 16px',
        modalWidth: '720px',
    },
    mediaWidth: mediaWidthTemplates,
}

export const haiTheme = merge(rainbowDarkTheme(), {
    blurs: {
        // modalOverlay: '...',
    },
    colors: {
        accentColor: 'black',
        // accentColorForeground: '...',
        // actionButtonBorder: darkTheme.border.medium,
        // actionButtonBorderMobile: '...',
        // actionButtonSecondaryBackground: '...',
        closeButton: 'black',
        closeButtonBackground: 'transparent',
        // connectButtonBackground: '#05284c',
        // connectButtonBackgroundError: '...',
        // connectButtonInnerBackground: '...',
        // connectButtonText: '...',
        // connectButtonTextError: '...',
        // connectionIndicator: '...',
        // downloadBottomCardBackground: '...',
        // downloadTopCardBackground: '...',
        // error: '...',
        // generalBorder: darkTheme.border.medium,
        // generalBorderDim: '...',
        // menuItemBackground: '...',
        // modalBackdrop: '...',
        modalBackground: darkTheme.colors.background,
        // modalBorder: darkTheme.border.medium,
        modalText: 'black',
        modalTextDim: 'black',
        modalTextSecondary: 'black',
        profileAction: darkTheme.colors.yellowish,
        profileActionHover: darkTheme.colors.yellowish,
        // profileForeground: '...',
        // selectedOptionBorder: '...',
        // standby: '...',
    },
    fonts: {
        // body: '...',
    },
    radii: {
        actionButton: '999px',
        // connectButton: '50px',
        menuButton: '999px',
        // modal: '...',
        // modalMobile: '...',
    },
    shadows: {
        // connectButton: '...',
        dialog: '0 0 0 2px black',
        profileDetailsAction: '0 0 0 2px black',
        // selectedOption: '...',
        // selectedWallet: '...',
        // walletLogo: '...',
    },
} as RainbowTheme)
