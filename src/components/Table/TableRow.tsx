import { type ComponentType, Fragment, type HTMLProps } from 'react'

import type { SortableHeader } from '~/types'
import { type MediaWidth } from '~/utils'

import styled, { css } from 'styled-components'
import { Flex, type FlexProps, Text } from '~/styles'
import { Tooltip } from '../Tooltip'

type RowItemProps = {
    content: JSX.Element
    props?: FlexProps
    unwrapped?: boolean
    fullWidth?: boolean
}

export type TableRowProps = Omit<HTMLProps<HTMLElement>, 'ref' | 'headers'> &
    Record<`$${string}`, any> & {
        container: ComponentType
        headers: SortableHeader[]
        items: RowItemProps[]
        compactQuery?: MediaWidth
    }
export function TableRow({
    headers,
    items,
    container: Container,
    compactQuery = 'upToSmall',
    ...props
}: TableRowProps) {
    return (
        <Container {...props}>
            {items.map(({ content, props, unwrapped = false, fullWidth = false }, i) =>
                unwrapped ? (
                    <Fragment key={i}>{content}</Fragment>
                ) : (
                    <RowItem key={i} $fullWidth={fullWidth} $compactQuery={compactQuery} {...props}>
                        <MobileHeader>
                            <Text>{headers[i].label}</Text>
                            {!!headers[i].tooltip && <Tooltip width="160px">{headers[i].tooltip}</Tooltip>}
                        </MobileHeader>
                        {content}
                    </RowItem>
                )
            )}
        </Container>
    )
}

const RowItem = styled(Flex).attrs((props: FlexProps) => ({
    $column: true,
    $gap: 8,
    ...props,
}))<{ $fullWidth: boolean; $compactQuery: MediaWidth }>`
    & > *:first-child {
        display: none;
    }

    ${({ theme, $fontSize = '1.2em', $fullWidth, $compactQuery }) => theme.mediaWidth[$compactQuery]`
        ${css`
            font-size: ${$fontSize};
        `}
        font-weight: 700;
        ${
            $fullWidth &&
            css`
                grid-column: 1 / -1;
            `
        }
        & > *:first-child {
            display: flex;
        }
    `}
`
const MobileHeader = styled(Flex).attrs((props) => ({
    $width: '100%',
    $align: 'center',
    $gap: 8,
    $fontWeight: 400,
    $fontSize: '0.8rem',
    ...props,
}))``
