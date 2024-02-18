import { useEffect, useState } from 'react'

import { Status } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useMediaQuery, useVaultById } from '~/hooks'

import styled from 'styled-components'
import { BlurContainer, Flex, Grid, HaiButton, Text } from '~/styles'
import { ContentWithStatus } from '~/components/ContentWithStatus'
import { BrandedTitle } from '~/components/BrandedTitle'
import { Overview } from './Overview'
import { ActivityTable } from './ActivityTable'
import { AddressLink } from '~/components/AddressLink'
import { ArrowUpRight } from 'react-feather'
import { LiquidateVaultModal } from '~/components/Modal/LiquidateVaultModal'

type VaultByIdProps = {
    id?: string
}
export function VaultById({ id = '' }: VaultByIdProps) {
    const {
        vaultModel: { liquidationData },
    } = useStoreState((state) => state)
    const {
        popupsModel: { toggleModal },
    } = useStoreActions((actions) => actions)

    const { error, loading, vault, refetch } = useVaultById(id)

    const isLargerThanSmall = useMediaQuery('upToSmall')

    const [liquidateVault, setLiquidateVault] = useState<{
        id: string
        collateralRatio: string
        status: Status
    }>()
    useEffect(() => {
        toggleModal({
            modal: 'liquidate',
            isOpen: !!liquidateVault,
        })
    }, [liquidateVault, toggleModal])

    const liquidationCRatio = vault
        ? liquidationData?.collateralLiquidationData[vault.collateralToken]?.liquidationCRatio
        : undefined

    return (
        <>
            {!!liquidateVault && (
                <LiquidateVaultModal
                    onClose={() => setLiquidateVault(undefined)}
                    {...liquidateVault}
                    onSuccess={refetch}
                />
            )}
            <Container>
                <Header>
                    <BrandedTitle textContent={`VAULT #${id}`} $fontSize={isLargerThanSmall ? '3rem' : '2.4rem'} />
                </Header>
                <Body>
                    <ContentWithStatus
                        loading={loading}
                        error={error?.message}
                        isEmpty={!loading && !vault}
                        emptyContent={`Vault with id '${id}' not found`}
                    >
                        <BodyGrid>
                            {!!vault && (
                                <BodyHeader>
                                    <Flex $justify="flex-start" $align="center" $gap={4}>
                                        <Text>Owner:</Text>
                                        <AddressLink address={vault.owner.address} $fontWeight={700} isOwner />
                                        <ArrowUpRight size={18} />
                                    </Flex>
                                    <HaiButton
                                        disabled={
                                            !liquidationCRatio ||
                                            100 * Number(liquidationCRatio) < Number(vault.collateralRatio)
                                        }
                                        onClick={() =>
                                            setLiquidateVault({
                                                id: vault.safeId,
                                                collateralRatio: vault.collateralRatio,
                                                status: vault.status,
                                            })
                                        }
                                    >
                                        Liquidate
                                    </HaiButton>
                                </BodyHeader>
                            )}
                            <Overview vault={vault} />
                            <ActivityTable vault={vault} />
                        </BodyGrid>
                    </ContentWithStatus>
                </Body>
            </Container>
        </>
    )
}

const Container = styled(BlurContainer)`
    width: 100%;
    min-height: 400px;
    margin-bottom: 48px;
`

const Header = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 24,
    ...props,
}))`
    position: relative;
    padding: 24px 48px;
    border-bottom: ${({ theme }) => theme.border.medium};

    ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column;
        align-items: flex-start;
        padding: 24px;
    `}

    z-index: 1;
`

const Body = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'flex-start',
    $gap: 48,
    ...props,
}))`
    padding: 0px;
`

const BodyGrid = styled(Grid)`
    width: 100%;
    grid-template-columns: 1fr;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        grid-template-columns: 1fr;
        grid-gap: 24px;
    `}
`

const BodyHeader = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    ...props,
}))`
    padding: 48px;
    padding-bottom: 0px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 24px;
        padding-bottom: 0px;
    `}
`
