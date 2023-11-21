import type { TableHeaderProps } from '~/types'

import styled from 'styled-components'
import { Grid, Text } from '~/styles'
import { TableHeaderItem } from '~/components/TableHeaderItem'

export function AuctionTableHeader({ headers, sorting, onSort }: TableHeaderProps) {
    return (
        <TableHeader>
            {headers.map(({ label, unsortable }) => (
                <TableHeaderItem
                    key={label}
                    sortable={!unsortable}
                    isSorting={sorting.key === label ? sorting.dir: false}
                    onClick={() => onSort(label)}>
                    <Text $fontWeight={sorting.key === label ? 700: 400}>{label}</Text>
                </TableHeaderItem>
            ))}
            <Text></Text>
        </TableHeader>
    )
}

export const TableHeader = styled(Grid)`
    grid-template-columns: repeat(7, 1fr) 20px;
    align-items: center;
    padding: 4px 16px;
    font-size: 0.8rem;
    flex-shrink: 0;

    & > * {
        padding: 0 4px;
    }
`