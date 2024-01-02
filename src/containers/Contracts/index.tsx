import { useMemo } from 'react'

import type { SortableHeader } from '~/types'
import { contractsDescriptions } from '~/utils/contractsDescription'
import { useMediaQuery, usePublicGeb } from '~/hooks'

import styled from 'styled-components'
import { BlurContainer, Flex, Grid, Text } from '~/styles'
import { BrandedTitle } from '~/components/BrandedTitle'
import { AddressLink } from '~/components/AddressLink'
import { Table, TableContainer } from '~/components/Table'

const sortableHeaders: SortableHeader[] = [
    { label: 'Contract' },
    { label: 'Address' },
    { label: 'Description' },
].map(obj => ({ ...obj, unsortable: true }))

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

    const isLargerThanSmall = useMediaQuery('upToSmall')

    return (
        <Container>
            <Header>
                <BrandedTitle
                    textContent="CONTRACTS"
                    $fontSize={isLargerThanSmall ? '3rem': '2.4rem'}
                />
            </Header>
            <Table
                container={StyledTableContainer}
                headers={sortableHeaders}
                headerContainer={TableHeader}
                sorting={{ key: '', dir: 'desc' }}
                setSorting={() => {}}
                rows={contracts.map(({ name, address, description }) => (
                    <TableRow key={name}>
                        <Text $fontWeight={isLargerThanSmall ? 400: 700}>{name}</Text>
                        <AddressLink address={address}/>
                        <Text>{description}</Text>
                    </TableRow>
                ))}
            />
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

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 24px;
    `}

    z-index: 1;
`

const StyledTableContainer = styled(TableContainer)`
    padding: 48px;
    padding-top: 24px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 0px;
        gap: 0px;
    `}
`
const TableHeaderBase = styled(Grid)`
    grid-template-columns: 240px 120px 1fr;
    align-items: center;
    grid-gap: 12px;
    padding: 8px 16px;
    font-size: 0.8rem;

    & > * {
        padding: 0 4px;
    }
`
const TableHeader = styled(TableHeaderBase)`
    & ${Text} {
        font-weight: 700;
    }
`
const TableRow = styled(TableHeaderBase)`
    border-radius: 999px;
    &:nth-child(2n) {
        background-color: rgba(0,0,0,0.05);
    }
    
    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 24px;
        grid-template-columns: 1fr;
        grid-gap: 12px;
        border-radius: 0px;
        background-color: unset;

        &:not(:first-child) {
            border-top: ${theme.border.medium};
        }
    `}
`
