import styled, { css } from 'styled-components'
import { type FlexProps, FlexStyle } from './Flex'

export type BlurContainerProps = FlexProps & {
    $bg?: string
}
export const BlurContainer = styled.div<BlurContainerProps>`
    ${FlexStyle}
    position: relative;
    flex-direction: column;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;
    background-color: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(13px);

    ${({ $bg, theme }) =>
        !!$bg &&
        css`
            &::before {
                content: '';
                position: absolute;
                inset: 0px;
                border-radius: inherit;
                background: ${(theme.colors as any)[$bg] || $bg};
                z-index: -1;
            }
        `}

    & > * {
        padding: 48px;
    }

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        border-radius: 12px;
        & > * {
            padding: 24px;
        }
    `}
`
