import type { ReactChildren } from '~/types'
import { Status } from '~/utils'

import styled, { css } from 'styled-components'
import { Flex, type FlexProps } from '~/styles'

type StatusLabelProps = FlexProps & {
    status: Status
    size?: number
    color?: string
    background?: string
    bordered?: boolean
    textOnly?: boolean
    unpadded?: boolean
    children?: ReactChildren
}
export function StatusLabel({
    status,
    size = 1,
    color,
    background,
    bordered = false,
    textOnly = false,
    unpadded = false,
    children,
    ...props
}: StatusLabelProps) {
    return (
        <Container
            $status={status}
            $size={size}
            $color={color}
            $bg={background}
            $bordered={bordered}
            $textOnly={textOnly}
            $unpadded={unpadded}
            $justify="space-between"
            $align="center"
            $gap={8}
            {...props}
        >
            {children || status}
        </Container>
    )
}

const Container = styled(Flex)<{
    $status: Status
    $size: number
    $color?: string
    $bg?: string
    $bordered: boolean
    $textOnly: boolean
    $unpadded: boolean
}>`
    ${({ $textOnly, $unpadded }) =>
        !$textOnly &&
        !$unpadded &&
        css`
            padding: 8px 12px;
        `}
    font-size: ${({ $size }) => $size * 0.8}rem;
    font-weight: 700;
    border-radius: 999px;
    ${({ theme, $bordered }) =>
        $bordered &&
        css`
            border: ${theme.border.thin};
        `}

    &::before {
        content: '';
        width: ${({ $size }) => $size * 0.6}rem;
        height: ${({ $size }) => $size * 0.6}rem;
        border-radius: 50%;
        flex-shrink: 0;
        display: none;
    }

    background: ${({ $bg = 'white', theme }) => (theme.colors as any)[$bg] || $bg};
    ${({ $status, $color, theme }) => {
        switch ($status) {
            case Status.SAFE:
            case Status.POSITIVE:
                return css`
                    color: ${$color || theme.colors.successColor};
                `
            case Status.DANGER:
                return css`
                    color: white;
                    background: ${$color || theme.colors.dangerColor};
                `
            case Status.UNSAFE:
            case Status.NEGATIVE:
                return css`
                    color: ${$color || theme.colors.dangerColor};
                `
            case Status.OKAY:
            case Status.NEUTRAL:
                return css`
                    color: ${$color || theme.colors.warningColor};
                `
            case Status.UNKNOWN:
                return css`
                    color: ${$color || 'black'};
                `
            case Status.LIVE:
                return css`
                    color: ${$color || theme.colors.successColor};
                    &::before {
                        background: ${$color || theme.colors.successColor};
                        display: block;
                    }
                `
            case Status.RESTARTING:
                return css`
                    color: ${$color || theme.colors.warningColor};
                    &::before {
                        background: ${$color || theme.colors.warningColor};
                        display: block;
                    }
                `
            case Status.COMPLETED:
                return css`
                    color: ${$color || 'black'};
                    &::before {
                        background: ${$color || 'black'};
                        display: block;
                    }
                `
            case Status.SETTLING:
                return css`
                    color: ${$color || theme.colors.blueish};
                    &::before {
                        background: ${$color || theme.colors.blueish};
                        display: block;
                    }
                `
            default:
                return css`
                    color: ${$color || 'inherit'};
                `
        }
    }};

    ${({ $textOnly }) =>
        $textOnly &&
        css`
            &::before {
                display: none !important;
            }
        `}
`
