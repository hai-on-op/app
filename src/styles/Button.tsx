import styled, { css } from 'styled-components'

export type ButtonProps = {
    disabled?: boolean
    color?: 'blueish' | 'greenish' | 'yellowish' | 'colorPrimary' | 'colorSecondary'
}

export const ButtonStyle = css<ButtonProps>`
    pointer-events: ${({ disabled }) => (disabled ? 'none' : 'inherit')};
    outline: none;
    cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
    min-width: 134px;
    border: none;
    box-shadow: none;
    line-height: 24px;
    font-size: ${(props) => props.theme.font.small};
    font-weight: 600;
    padding: 8px 30px;
    color: ${(props) => props.theme.colors.neutral};
    background: ${({ theme, disabled, color }) =>
        disabled ? theme.colors.dimmedBackground : theme.colors[color ?? 'blueish']};
    border-radius: ${(props) => props.theme.global.borderRadius};
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    border-radius: 50px;
    justify-content: space-between;
`

export type HaiButtonProps = {
    disabled?: boolean,
    $variant?: 'default' | 'unblurred' | 'blueish' | 'greenish' | 'pinkish' | 'yellowish' | 'orangeish',
    $unbordered?: boolean
}
export const HaiButton = styled.button<HaiButtonProps>`
    pointer-events: ${({ disabled }) => (disabled ? 'none' : 'inherit')};
    outline: none;
    cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
    min-width: 134px;
    border: ${({ theme, $unbordered }) => $unbordered ? 'none': theme.border.thick};
    box-shadow: none;
    line-height: 24px;
    font-size: ${(props) => props.theme.font.small};
    font-weight: 600;
    white-space: nowrap;
    padding: 8px 30px;
    color: black;
    ${({ theme, $variant = 'default' }) => ($variant === 'default'
        ? css`
            backdrop-filter: ${(theme as any).blur || '13px'};
            background: transparent;
        `
        : css`background: ${(theme.colors as any)[ $variant ] || 'transparent'};`
    )}
    border-radius: 999px;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
`