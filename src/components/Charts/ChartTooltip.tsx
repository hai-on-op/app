import { type HTMLProps, forwardRef } from 'react'

import styled from 'styled-components'
import { CenteredFlex, Popout, Text } from '~/styles'

type ChartTooltipProps = Omit<HTMLProps<HTMLDivElement>, 'children' | 'ref' | 'as' | 'label'> & {
    heading: string | number
    subHeading: string | number
    label?: string | number
    color: string
    size?: number
    active?: boolean
}
export const ChartTooltip = forwardRef<HTMLDivElement, ChartTooltipProps>(
    ({ heading, subHeading, label, color, size = 0, active = false, ...props }, ref) => (
        <PopoutContainer ref={ref} $size={size} {...props}>
            <GraphPopout hidden={!active}>
                <Text $fontSize="1.4em" $fontWeight={700}>
                    {heading}
                </Text>
                <Text $fontSize="0.8em" $color={color}>
                    {subHeading}
                </Text>
                {!!label && <Text $fontSize="0.8em">{label}</Text>}
            </GraphPopout>
        </PopoutContainer>
    )
)

const PopoutContainer = styled(CenteredFlex)<{ $size: number }>`
    width: ${({ $size }) => $size}px;
    height: ${({ $size }) => $size}px;
    overflow: visible;

    z-index: 2;
`
const GraphPopout = styled(Popout).attrs((props) => ({
    $width: 'auto',
    $anchor: 'bottom',
    $margin: '20px',
    $gap: 4,
    $shrink: 0,
    ...props,
}))`
    min-width: fit-content;
    padding: 12px 24px;
    & > ${Text} {
        white-space: nowrap;
        &:nth-child(2) {
            filter: brightness(75%);
        }
    }
`
