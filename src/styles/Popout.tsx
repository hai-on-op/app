import styled, { css, keyframes } from 'styled-components'
import { Flex, FlexProps } from './Flex'

import popoutSVG from '~/assets/popout.svg'

/* eslint-disable indent */

const anim = (deltaY: number | string, transform = '') => keyframes`
    0% {
        opacity: 0;
        transform: translateY(${deltaY}px) ${transform};
    }
    100% {
        opacity: 1;
        transform: translateY(0px) ${transform};
    }
`

export type PopoutProps = FlexProps & {
    $float?: 'left' | 'center' | 'right'
    $anchor?: 'top' | 'bottom'
    $margin?: string
    $disableAnimation?: boolean
    hidden?: boolean
}

export const Popout = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'center',
    $align: 'center',
    $color: 'inherit',
    ...props,
}))<PopoutProps>`
    position: absolute;
    ${({ $float = 'center' }) =>
        $float === 'center'
            ? css`
                  left: 50%;
                  transform: translateX(-50%);
              `
            : $float === 'left'
            ? css`
                  right: -8px;
              `
            : css`
                  left: -8px;
              `}
    ${({ $anchor = 'top', $margin = '0px' }) =>
        $anchor === 'top'
            ? css`
                  top: calc(100% + ${$margin});
              `
            : css`
                  bottom: calc(100% + ${$margin});
              `}
    min-width: 100px;
    background-color: ${({ theme }) => theme.colors.background};
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;

    &::after {
        content: '';
        position: absolute;
        ${({ $float = 'center' }) =>
            $float === 'center'
                ? css`
                      left: 50%;
                  `
                : $float === 'left'
                ? css`
                      left: calc(100% - 48px);
                  `
                : css`
                      left: 48px;
                  `}
        ${({ $anchor = 'top' }) =>
            $anchor === 'top'
                ? css`
                      bottom: calc(100% - 0.5px);
                      transform: rotate(0deg);
                  `
                : css`
                      top: calc(100% - 0.5px);
                      transform: rotate(180deg);
                  `}
        width: 52px;
        height: 24px;
        margin-left: -26px;
        background-image: url('${popoutSVG}');
        background-size: contain;
        background-position: center bottom;
        background-repeat: no-repeat;
    }

    ${({ hidden }) =>
        hidden &&
        css`
            display: none;
        `}
    ${({ hidden, $disableAnimation = false, $anchor = 'top', $float = 'center' }) =>
        !hidden &&
        !$disableAnimation &&
        css`
            animation: ${anim($anchor === 'top' ? -8 : 8, $float === 'center' ? 'translateX(-50%)' : '')} 0.3s ease
                forwards;
        `}

    z-index: 1;
`
