import type { SetState } from '~/types'
import { useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'
import { useAvailableVaults, useMediaQuery, useMyVaults } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex } from '~/styles'
import { NavContainer } from '~/components/NavContainer'
import { CheckboxButton } from '~/components/CheckboxButton'
import { ProxyPrompt } from '~/components/ProxyPrompt'
import { StrategyAd, type StrategyAdProps } from '~/components/StrategyAd'
import { AvailableVaultsTable } from './AvailableVaultsTable'
import { MyVaultsTable } from './MyVaultsTable'
import { SortByDropdown } from '~/components/SortByDropdown'
import { CollateralDropdown } from '~/components/CollateralDropdown'

const strategies: StrategyAdProps[] = [
    {
        heading: 'OP REWARDS',
        status: 'NOW LIVE',
        description: 'Earn OP tokens by providing liquidity',
        cta: 'LP to Earn',
        ctaLink: '/earn',
        tokenImages: ['OP'],
    },
    {
        heading: 'KITE REWARDS',
        status: 'NOW LIVE',
        description: 'Earn KITE tokens by providing liquidity',
        cta: 'LP to Earn',
        ctaLink: '/earn',
        tokenImages: ['KITE'],
    },
]

type VaultsListProps = {
    navIndex: number
    setNavIndex: SetState<number>
}
export function VaultsList({ navIndex, setNavIndex }: VaultsListProps) {
    const { setActiveVault } = useVault()

    const isLargerThanSmall = useMediaQuery('upToSmall')

    const { vaultModel: vaultState } = useStoreState((state) => state)

    const {
        headers: availableHeaders,
        rows: availableVaults,
        sorting: availableSorting,
        setSorting: setAvailableSorting,
        eligibleOnly,
        setEligibleOnly,
    } = useAvailableVaults()

    const {
        headers: myVaultsHeaders,
        rows: myVaults,
        sorting: myVaultsSorting,
        setSorting: setMyVaultsSorting,
        assetsFilter,
        setAssetsFilter,
        showClosedVaults,
        setShowClosedVaults,
    } = useMyVaults()

    return (
        <NavContainer
            navItems={
                isLargerThanSmall
                    ? [`Available Vaults (${availableVaults.length})`, `My Vaults (${vaultState.list.length})`]
                    : ['Available Vaults', 'My Vaults']
            }
            selected={navIndex}
            onSelect={(i: number) => setNavIndex(i)}
            headerContent={
                navIndex === 0 ? (
                    <HeaderContent>
                        {!isLargerThanSmall && (
                            <SortByDropdown
                                headers={availableHeaders}
                                sorting={availableSorting}
                                setSorting={setAvailableSorting}
                            />
                        )}
                        <CheckboxButton checked={eligibleOnly} toggle={() => setEligibleOnly((e) => !e)}>
                            Eligible Vaults Only
                        </CheckboxButton>
                    </HeaderContent>
                ) : (
                    <HeaderContent>
                        <CollateralDropdown
                            label="Collateral Asset"
                            selectedAsset={assetsFilter}
                            onSelect={setAssetsFilter}
                        />
                        <CheckboxButton checked={showClosedVaults} toggle={() => setShowClosedVaults((e) => !e)}>
                            Show Closed Vaults
                        </CheckboxButton>
                        {!isLargerThanSmall && (
                            <SortByDropdown
                                headers={myVaultsHeaders}
                                sorting={myVaultsSorting}
                                setSorting={setMyVaultsSorting}
                            />
                        )}
                    </HeaderContent>
                )
            }
        >
            {navIndex === 0 ? (
                <>
                    <AvailableVaultsTable
                        headers={availableHeaders}
                        rows={availableVaults}
                        sorting={availableSorting}
                        setSorting={setAvailableSorting}
                    />
                    {strategies.map((strat, i) => (
                        <StrategyAd key={i} bgVariant={i} {...strat} />
                    ))}
                </>
            ) : (
                <ProxyPrompt
                    onCreateVault={
                        !vaultState.list.length
                            ? () =>
                                  setActiveVault({
                                      create: true,
                                      collateralName: 'WETH',
                                  })
                            : undefined
                    }
                >
                    <MyVaultsTable
                        headers={myVaultsHeaders}
                        rows={myVaults}
                        sorting={myVaultsSorting}
                        setSorting={setMyVaultsSorting}
                        onCreate={() =>
                            setActiveVault({
                                create: true,
                                collateralName: assetsFilter || 'WETH',
                            })
                        }
                    />
                </ProxyPrompt>
            )}
        </NavContainer>
    )
}

const HeaderContent = styled(CenteredFlex)`
    gap: 24px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column;
        gap: 12px;
        & > * {
            width: 100%;
            &:nth-child(1) {
                z-index: 5;
            }
            &:nth-child(2) {
                z-index: 4;
            }
            &:nth-child(3) {
                z-index: 3;
            }
            &:nth-child(4) {
                z-index: 2;
            }
            &:nth-child(5) {
                z-index: 1;
            }
        }
    `}
`
