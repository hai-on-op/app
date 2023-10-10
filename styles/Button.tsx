import { css } from 'styled-components'

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
