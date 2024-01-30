import { css } from 'styled-components'

export type DashedContainerProps = {
    $borderOpacity?: number
}

export const DashedContainerStyle = css<DashedContainerProps>`
    position: relative;

    &:after {
        content: '';
        position: absolute;
        inset: 0px;
        border: 2px dashed rgba(0, 0, 0, 0.1);

        ${({ theme }) => theme.border.dashedImage}

        opacity: ${({ $borderOpacity = 1 }) => $borderOpacity};
        pointer-events: none;
    }
`
