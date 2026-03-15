import { type HTMLProps, forwardRef } from 'react'

import styled from 'styled-components'
import { Text } from '~/styles'

type ChartTooltipProps = Omit<HTMLProps<HTMLDivElement>, 'children' | 'ref' | 'as' | 'label'> & {
    heading: string | number
    subHeading: string | number
    label?: string | number
    color: string
    size?: number
    active?: boolean
}
export const ChartTooltip = forwardRef<HTMLDivElement, ChartTooltipProps>(
    ({ heading, subHeading, label, color, size: _size = 0, active = true, ...props }, ref) => {
        if (!active) return null

        return (
            <TooltipCard ref={ref} data-chart-tooltip="card" {...props}>
                <Text $fontSize="1.4em" $fontWeight={700}>
                    {heading}
                </Text>
                <Text $fontSize="0.8em" $color={color}>
                    {subHeading}
                </Text>
                {!!label && <Text $fontSize="0.8em">{label}</Text>}
            </TooltipCard>
        )
    }
)
ChartTooltip.displayName = 'ChartTooltip'

const TooltipCard = styled.div`
    min-width: max-content;
    padding: 12px 24px;
    background-color: ${({ theme }) => theme.colors.background};
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;
    box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.12);

    & > ${Text} {
        white-space: nowrap;
        &:nth-child(2) {
            filter: brightness(75%);
        }
    }
`
