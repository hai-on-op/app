import type { ReactChildren } from '~/types'

import styled, { css } from 'styled-components'
import { Flex, type FlexProps, Text } from '~/styles'
import { HaiArrow } from '../Icons/HaiArrow'
import { Tooltip } from '../Tooltip'

type TableHeaderItemProps = FlexProps & {
    sortable?: boolean
    isSorting?: 'asc' | 'desc' | false
    onClick?: () => void
    tooltip?: ReactChildren
    tooltipAnchor?: 'top' | 'bottom'
    children?: ReactChildren
}
export function TableHeaderItem({
    sortable = false,
    isSorting,
    onClick,
    tooltip,
    tooltipAnchor,
    children,
    ...props
}: TableHeaderItemProps) {
    return (
        <Container
            $width="fit-content"
            $justify="center"
            $align="center"
            $gap={4}
            $grow={0}
            onClick={onClick}
            {...props}
        >
            {sortable && <HaiArrow strokeWidth={isSorting ? 3 : 2} direction={isSorting === 'asc' ? 'up' : 'down'} />}
            {typeof children === 'string' ? <Text>{children}</Text> : children}
            {!!tooltip && (
                <Tooltip width="200px" $anchor={tooltipAnchor} $color="black">
                    {tooltip}
                </Tooltip>
            )}
        </Container>
    )
}

const Container = styled(Flex)`
    ${({ onClick }) =>
        !!onClick &&
        css`
            cursor: pointer;
        `}

    & > svg {
        height: 12px;
        width: auto;
    }
`
