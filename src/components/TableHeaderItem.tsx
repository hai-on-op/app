import { type ReactNode } from 'react'

import styled, { css } from 'styled-components'
import { CenteredFlex, Text } from '~/styles'
import HaiArrow from './Icons/HaiArrow'

type TableHeaderItemProps = {
    sortable?: boolean,
    isSorting?: 'asc' | 'desc' | false,
    onClick?: () => void,
    children?: JSX.Element | ReactNode | ReactNode[]
}
export function TableHeaderItem({
    sortable = false,
    isSorting,
    onClick,
    children
}: TableHeaderItemProps) {
    return (
        <Container
            $gap={4}
            $grow={0}
            onClick={onClick}>
            {sortable && (
                <HaiArrow
                    strokeWidth={isSorting ? 3: 2}
                    style={{ transform: `rotate(${isSorting === 'asc' ? 180: 0}deg)` }}
                />
            )}
            {typeof children === 'string'
                ? <Text>{children}</Text>
                : children
            }
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
