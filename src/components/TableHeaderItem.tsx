import type { ReactChildren } from '~/types'

import styled, { css } from 'styled-components'
import { CenteredFlex, Text } from '~/styles'
import { HaiArrow } from './Icons/HaiArrow'
import { Tooltip } from './Tooltip'

type TableHeaderItemProps = {
    sortable?: boolean,
    isSorting?: 'asc' | 'desc' | false,
    onClick?: () => void,
    tooltip?: string,
    children?: ReactChildren
}
export function TableHeaderItem({
    sortable = false,
    isSorting,
    onClick,
    tooltip,
    children,
}: TableHeaderItemProps) {
    return (
        <Container
            $gap={4}
            $grow={0}
            onClick={onClick}>
            {sortable && (
                <HaiArrow
                    strokeWidth={isSorting ? 3: 2}
                    direction={isSorting === 'asc' ? 'up': 'down'}
                />
            )}
            {typeof children === 'string'
                ? <Text>{children}</Text>
                : children
            }
            {!!tooltip && <Tooltip width="200px">{tooltip}</Tooltip>}
        </Container>
    )
}

const Container = styled(CenteredFlex)`
    width: fit-content;
    ${({ onClick }) => !!onClick && css`cursor: pointer;`}

    & > svg {
        height: 12px;
        width: auto;
    }
`
