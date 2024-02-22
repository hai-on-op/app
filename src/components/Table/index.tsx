import { type ComponentType } from 'react'

import type { ReactChildren, SetState, SortableHeader, Sorting } from '~/types'
import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { Flex, type FlexProps, Text } from '~/styles'
import { TableHeaderItem } from './TableHeaderItem'
import { TableRow } from './TableRow'
import { ContentWithStatus, ContentWithStatusProps } from '../ContentWithStatus'

type TableProps = FlexProps &
    Partial<Omit<ContentWithStatusProps, 'children'>> & {
        container?: ComponentType
        headers: SortableHeader[]
        headerContainer: ComponentType
        headerProps?: Record<string, string | number | boolean | undefined>
        sorting: Sorting
        setSorting: SetState<Sorting>
        rows: ReactChildren[]
        footer?: ReactChildren
    }
export function Table({
    container: Container = TableContainer,
    headers,
    headerContainer: Header,
    headerProps,
    sorting,
    setSorting,
    rows,
    footer,
    loading = false,
    loadingContent,
    error,
    errorContent,
    isEmpty,
    emptyContent,
    ...props
}: TableProps) {
    const isLargerThanSmall = useMediaQuery('upToSmall')

    return (
        <Container {...props}>
            {isLargerThanSmall && (
                <Header {...headerProps}>
                    {headers.map(({ label, tooltip, tooltipAnchor, unsortable }) => (
                        <TableHeaderItem
                            key={label}
                            sortable={!unsortable}
                            isSorting={sorting.key === label ? sorting.dir : false}
                            onClick={
                                unsortable
                                    ? undefined
                                    : () =>
                                          setSorting((s) => ({
                                              key: label,
                                              dir: s.key === label && s.dir === 'desc' ? 'asc' : 'desc',
                                          }))
                            }
                            tooltip={tooltip}
                            tooltipAnchor={tooltipAnchor}
                        >
                            <Text $fontWeight={sorting.key === label ? 700 : 400}>{label}</Text>
                        </TableHeaderItem>
                    ))}
                </Header>
            )}
            <ContentWithStatus
                loading={loading}
                loadingContent={loadingContent}
                error={error}
                errorContent={errorContent}
                isEmpty={isEmpty}
                emptyContent={emptyContent}
            >
                {rows}
            </ContentWithStatus>
            {footer}
        </Container>
    )
}

Table.HeaderItem = TableHeaderItem
Table.Row = TableRow

export const TableContainer = styled(Flex).attrs((props: FlexProps) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'stretch',
    $gap: 12,
    ...props,
}))`
    ${({ theme }) => theme.mediaWidth.upToSmall`
        gap: 0px;
    `}
`
