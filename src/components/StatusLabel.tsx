import type { ReactChildren } from '~/types'

import styled, { css } from 'styled-components'
import { Flex, type FlexProps } from '~/styles'

export enum Status {
    SAFE = 'SAFE',
    DANGER = 'DANGER',
    LIVE = 'LIVE',
    COMPLETED = 'COMPLETED',
    RESTARTING = 'RESTARTING',
    SETTLING = 'SETTLING',
    POSITIVE = 'POSITIVE',
    NEGATIVE = 'NEGATIVE',
    NEUTRAL = 'NEUTRAL',
    CUSTOM = 'CUSTOM'
}

type StatusLabelProps = FlexProps & {
    status: Status,
    size?: number,
    color?: string,
    background?: string,
    children?: ReactChildren
}
export function StatusLabel({
    status,
    size = 1,
    color,
    background,
    children,
    ...props
}: StatusLabelProps) {
    return (
        <Container
            $status={status}
            $size={size}
            $color={color}
            $bg={background}
            $justify="space-between"
            $align="center"
            $gap={8}
            {...props}>
            {children || status}
        </Container>
    )
}

const Container = styled(Flex)<{ $status: Status, $size: number, $color?: string, $bg?: string }>`
    padding: 8px 12px;
    font-size: ${({ $size }) => $size * 0.8}rem;
    font-weight: 700;
    border-radius: 999px;

    &::before {
        content: '';
        width: ${({ $size }) => $size * 0.6}rem;
        height: ${({ $size }) => $size * 0.6}rem;
        border-radius: 50%;
        flex-shrink: 0;
        display: none;
    }

    background: ${({ $bg = 'white' }) => $bg};
    ${({ $status, $color, theme }) => {
        switch($status) {
            case Status.SAFE:
            case Status.POSITIVE: return css`
                color: ${$color || theme.colors.successColor};
            `
            case Status.DANGER:
            case Status.NEGATIVE: return css`
                color: ${$color || theme.colors.dangerColor};
            `
            case Status.NEUTRAL: return css`
                color: ${$color || theme.colors.dimmedColor};
            `
            case Status.LIVE: return css`
                color: ${$color || theme.colors.successColor};
                &::before {
                    background: ${$color || theme.colors.successColor};
                    display: block;
                }
            `
            case Status.RESTARTING: return css`
                color: ${$color || theme.colors.warningColor};
                &::before {
                    background: ${$color || theme.colors.warningColor};
                    display: block;
                }
            `
            case Status.COMPLETED:
            case Status.SETTLING: return css`
                color: ${$color || theme.colors.blueish};
                &::before {
                    background: ${$color || theme.colors.blueish};
                    display: block;
                }
            `
            default: return css`
                color: ${$color || 'inherit'};
            `
        }
    }};
`
