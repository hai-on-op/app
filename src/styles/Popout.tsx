import styled, { css } from 'styled-components'
import { Flex, FlexProps } from './Flex'

import popoutSVG from '~/assets/popout.svg'

export type PopoutProps = FlexProps & {
    $float?: 'left' | 'center' | 'right',
    $anchor?: 'top' | 'bottom',
    $margin?: string,
    hidden?: boolean
}

export const Popout = styled(Flex).attrs((props => ({
    $width: '100%',
    $column: true,
    $justify: 'center',
    $align: 'center',
    ...props
})))<PopoutProps>`
    position: absolute;
    ${({ $float = 'center' }) => ($float === 'center'
        ? css`
            left: 50%;
            transform: translateX(-50%);
        `
        : $float === 'left'
            ? css`right: -8px;`
            : css`left: -8px;`
    )}
    ${({ $anchor = 'top', $margin = '0px' }) => ($anchor === 'top'
        ? css`top: calc(100% + ${$margin});`
        : css`bottom: calc(100% + ${$margin});`
    )}
    min-width: 100px;
    background-color: ${({ theme }) => theme.colors.background};
    color: inherit;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;

    &::after {
        content: '';
        position: absolute;
        ${({ $float = 'center' }) => ($float === 'center'
            ? css`left: 50%;`
            : $float === 'left'
                ? css`left: calc(100% - 48px);`
                : css`left: 48px;`
        )}
        ${({ $anchor = 'top' }) => ($anchor === 'top'
            ? css`
                bottom: calc(100% - 0.5px);
                transform: rotate(0deg);
            `
            : css`
                top: calc(100% - 0.5px);
                transform: rotate(180deg);
            `
        )}
        width: 56px;
        height: 24px;
        margin-left: -28px;
        background-image: url('${popoutSVG}');
        background-size: contain;
        background-position: center bottom;
        background-repeat: no-repeat;
    }

    ${({ hidden }) => hidden && css`display: none;`}

    z-index: 1;
`