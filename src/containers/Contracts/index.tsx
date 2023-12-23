import { useMemo } from 'react'

import type { SortableHeader } from '~/types'
import { contractsDescriptions } from '~/utils/contractsDescription'
import { usePublicGeb } from '~/hooks'

import styled from 'styled-components'
import { BlurContainer, Flex, Grid, Text } from '~/styles'
import { BrandedTitle } from '~/components/BrandedTitle'
import { TableHeaderItem } from '~/components/TableHeaderItem'
import { AddressLink } from '~/components/AddressLink'

const sortableHeaders: SortableHeader[] = [
    { label: 'Contract' },
    { label: 'Address' },
    { label: 'Description' },
]

export function Contracts() {
    const geb = usePublicGeb()

    const contracts = useMemo(() => {
        if (!geb) return []
        
        return Object.entries(geb.contracts)
            .filter(([, value]) => !!value.address)
            .map(([name, value]) => ({
                name,
                address: value.address,
                description: contractsDescriptions[name],
            }))
    }, [geb])

    return (
        <Container>
            <Header>
                <BrandedTitle
                    textContent="CONTRACTS"
                    $fontSize="3rem"
                />
            </Header>
            <Table>
                <TableHeader>
                    {sortableHeaders.map(({ label, tooltip }) => (
                        <TableHeaderItem
                            key={label}
                            sortable={false}
                            tooltip={tooltip}>
                            <Text $fontWeight={700}>{label}</Text>
                        </TableHeaderItem>
                    ))}
                    <Text></Text>
                </TableHeader>
                {contracts.map(({ name, address, description }) => (
                    <TableRow key={name}>
                        <Text>{name}</Text>
                        <AddressLink address={address}/>
                        <Text>{description}</Text>
                    </TableRow>
                ))}
            </Table>
        </Container>
    )
}

const Container = styled(BlurContainer)`
    width: 100%;
    margin-bottom: 48px;
    & > * {
        padding: 0px;
    }
`

const Header = styled(Flex).attrs(props => ({
    $justify: 'space-between',
    $align: 'center',
    $gap: 24,
    ...props,
}))`
    position: relative;
    padding: 48px;
    border-bottom: ${({ theme }) => theme.border.medium};
    z-index: 1;
`

const Table = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'stretch',
    $gap: 12,
    ...props,
}))`
    padding: 48px;
    padding-top: 24px;
`
const TableHeader = styled(Grid)`
    grid-template-columns: 240px 120px 1fr;
    align-items: center;
    grid-gap: 12px;
    padding: 8px 16px;
    font-size: 0.8rem;

    & > * {
        padding: 0 4px;
    }
`
const TableRow = styled(TableHeader)`
    border-radius: 999px;
    &:nth-child(2n) {
        background-color: rgba(0,0,0,0.05);
    }
    /* &:hover {
        background-color: rgba(0,0,0,0.1);
    } */
`
