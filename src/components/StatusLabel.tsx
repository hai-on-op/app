import type { ReactChildren } from '~/types'

import styled, { css } from 'styled-components'
import { Flex, type FlexProps } from '~/styles'

export enum Status {
    SAFE = 'SAFE',
    DANGER = 'DANGER',
    LIVE = 'LIVE',
    COMPLETED = 'COMPLETED',
    POSITIVE = 'POSITIVE',
    NEGATIVE = 'NEGATIVE',
    NEUTRAL = 'NEUTRAL',
    CUSTOM = 'CUSTOM'
}

type StatusLabelProps = FlexProps & {
    status: Status,
    color?: string,
    background?: string,
    children?: ReactChildren
}
export function StatusLabel({
    status,
    color,
    background,
    children,
    ...props
}: StatusLabelProps) {
    return (
        <Container
            $status={status}
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

const Container = styled(Flex)<{ $status: Status, $color?: string, $bg?: string }>`
    padding: 8px 12px;
    font-size: 0.8rem;
    font-weight: 700;
    border-radius: 999px;

    &::before {
        content: '';
        width: 0.6rem;
        height: 0.6rem;
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
            case Status.COMPLETED: return css`
                color: ${$color || 'black'};
                &::before {
                    background: ${$color || 'black'};
                    display: block;
                }
            `
            default: return css`
                color: ${$color || 'inherit'};
            `
        }
    }};
`
