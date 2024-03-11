import { useMemo } from 'react'

import type { SortableHeader } from '~/types'
import { contractsDescriptions } from '~/utils/contractsDescription'
import { useMediaQuery, usePublicGeb } from '~/hooks'

import styled from 'styled-components'
import { BlurContainer, Flex, Grid, Text } from '~/styles'
import { BrandedTitle } from '~/components/BrandedTitle'
import { AddressLink } from '~/components/AddressLink'
import { Table, TableContainer } from '~/components/Table'
import { Copyable } from '~/components/Copyable'
import { Link } from '~/components/Link'
import { ArrowUpRight } from 'react-feather'

const externalContracts = [
    {
        address: '0x146b020399769339509c98b7b353d19130c150ec',
        name: 'Uniswap V3 Pool - HAI/WETH (0.3%)',
        description: `Uniswap liquidity pool. Incentivized with KITE and OP rewards (full-range only).`,
        labelLink: 'View on Uniswap',
        link: 'https://info.uniswap.org/#/optimism/pools/0x146b020399769339509c98b7b353d19130c150ec',
    },
    {
        address: '0x2A087fd694DeBec1ED61E0740BD0810b804da8f0',
        name: 'Uniswap V3 Pool - HAI/WETH (1%)',
        description: `Uniswap liquidity pool.`,
        labelLink: 'View on Uniswap',
        link: 'https://info.uniswap.org/#/optimism/pools/0x2a087fd694debec1ed61e0740bd0810b804da8f0',
    },
    {
        address: '0xbdED651C03E2bC332AA49C1ffCa391eAA3ea6B86',
        name: 'Velodrome Pool - HAI/sUSD',
        description: `Velodrome liquidity pool. Incentivized with KITE and OP rewards.`,
        labelLink: 'View on Velodrome',
        link: 'https://velodrome.finance/deposit?token0=0x10398AbC267496E49106B07dd6BE13364D10dC71&token1=0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9&type=0',
    },
    {
        address: '0xf4638dC488F9C826DC40250515592E678E447238',
        name: 'Velodrome Pool - KITE/OP',
        description: `Velodrome liquidity pool. Incentivized with KITE rewards.`,
        labelLink: 'View on Velodrome',
        link: 'https://velodrome.finance/deposit?token0=0x4200000000000000000000000000000000000042&token1=0xf467C7d5a4A9C4687fFc7986aC6aD5A4c81E1404&type=-1',
    },
]

const sortableHeaders: SortableHeader[] = [{ label: 'Contract' }, { label: 'Address' }, { label: 'Description' }].map(
    (obj) => ({ ...obj, unsortable: true })
)

export function Contracts() {
    const geb = usePublicGeb()

    const contracts = useMemo(() => {
        if (!geb) return []

        return Object.entries(geb.contracts)
            .filter(([name, value]) => !!value.address && name !== 'weth')
            .map(([name, value]) => ({
                name: name.replace('safe', 'vault').replace('Safe', 'Vault'),
                address: value.address,
                description: contractsDescriptions[name],
            }))
            .concat(
                Object.entries(geb.tokenList).reduce((arr, [token, { address, collateralJoin }]) => {
                    if (address) {
                        arr.push({
                            name: `ERC20 Token - ${token}`,
                            address,
                            description: `The ERC20 token contract of the ${token} collateral.`,
                        })
                    }
                    if (collateralJoin) {
                        arr.push({
                            name: `Collateral Join - ${token}`,
                            address: collateralJoin,
                            description: `The address of the Collateral Join contract that holds all ${token} deposited into Vaults.`,
                        })
                    }
                    return arr
                }, [] as any[])
            )
    }, [geb])

    const isUpToSmall = useMediaQuery('upToSmall')

    return (
        <>
            <Container>
                <Header>
                    <BrandedTitle textContent="CONTRACTS" $fontSize={isUpToSmall ? '2.4rem' : '3rem'} />
                </Header>
                <Table
                    container={StyledTableContainer}
                    headers={sortableHeaders}
                    headerContainer={TableHeader}
                    sorting={{ key: '', dir: 'desc' }}
                    setSorting={() => {}}
                    rows={contracts.map(({ name, address, description }) => (
                        <TableRow key={name}>
                            <Text $fontWeight={isUpToSmall ? 700 : 400}>{name}</Text>
                            <Copyable text={address} limitClickToIcon>
                                <AddressLink address={address} />
                            </Copyable>
                            <Text>{description}</Text>
                        </TableRow>
                    ))}
                />
            </Container>
            <Container>
                <Header>
                    <BrandedTitle textContent="EXTERNAL CONTRACTS" $fontSize={isUpToSmall ? '2.4rem' : '3rem'} />
                </Header>
                <Table
                    container={StyledTableContainer}
                    headers={sortableHeaders}
                    headerContainer={TableHeader}
                    sorting={{ key: '', dir: 'desc' }}
                    setSorting={() => {}}
                    rows={externalContracts.map(({ name, address, description, labelLink, link }) => (
                        <TableRow key={name}>
                            <Text $fontWeight={isUpToSmall ? 700 : 400}>{name}</Text>
                            <Copyable text={address} limitClickToIcon>
                                <AddressLink address={address} />
                            </Copyable>
                            <Text>
                                {description}&nbsp;
                                <Link href={link}>
                                    <Text>{labelLink}</Text>
                                    <ArrowUpRight size={16} />
                                </Link>
                            </Text>
                        </TableRow>
                    ))}
                />
            </Container>
        </>
    )
}

const Container = styled(BlurContainer)`
    width: 100%;
    margin-bottom: 48px;
    & > * {
        padding: 0px;
    }
`

const Header = styled(Flex).attrs((props) => ({
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
    grid-template-columns: 240px 128px 1fr;
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
        background-color: rgba(0, 0, 0, 0.05);
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
