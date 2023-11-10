import styled from 'styled-components'
import { type FlexProps, FlexStyle } from './Flex'

export const BlurContainer = styled.div<FlexProps>`
    ${FlexStyle}
    flex-direction: column;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;
    background-color: rgba(255,255,255,0.15);
    backdrop-filter: blur(13px);

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