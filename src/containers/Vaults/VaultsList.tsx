import { type Dispatch, type SetStateAction, useMemo, useState } from 'react'
import { BigNumber } from 'ethers'

import { getRatePercentage, type AvailableVaultPair, formatNumberWithStyle } from '~/utils'
import { useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'

import { CenteredFlex, Text } from '~/styles'
import { NavContainer } from '~/components/NavContainer'
import { CheckboxButton } from '~/components/CheckboxButton'
import { BrandedDropdown, DropdownOption } from '~/components/BrandedDropdown'
import { ProxyPrompt } from '~/components/ProxyPrompt'
import { AvailableVaultsTable } from './AvailableVaultsTable'
import { MyVaultsTable } from './MyVaultsTable'

const assets = [
    'All',
    'WETH',
    'WSTETH',
    'OP',
]

type VaultsListProps = {
    navIndex: number,
    setNavIndex: Dispatch<SetStateAction<number>>
}
export function VaultsList({ navIndex, setNavIndex }: VaultsListProps) {
    const { setActiveVault } = useVault()

    const [eligibleOnly, setEligibleOnly] = useState(false)
    const [assetsFilter, setAssetsFilter] = useState<string>()

    const {
        connectWalletModel: {
            tokensData,
            tokensFetchedData,
        },
        safeModel: safeState,
    } = useStoreState(state => state)

    const myVaults = useMemo(() => {
        const temp = safeState.list
        if (!assetsFilter) return temp

        return temp.filter(({ collateralName }) => (
            collateralName.toUpperCase() === assetsFilter
        ))
    }, [safeState.list, assetsFilter])

    const availableVaults: AvailableVaultPair[] = useMemo(() => {
        return Object.values(tokensData || {})
            .filter(({ isCollateral }) => isCollateral)
            .map(({ symbol }) => {
                const {
                    liquidationCRatio,
                    totalAnnualizedStabilityFee,
                } = safeState.liquidationData?.collateralLiquidationData[symbol] || {}
                return {
                    collateralName: symbol,
                    collateralizationFactor: liquidationCRatio
                        ? formatNumberWithStyle(liquidationCRatio, {
                            maxDecimals: 0,
                            style: 'percent',
                        })
                        : '--%',
                    apy: totalAnnualizedStabilityFee
                        ? getRatePercentage(totalAnnualizedStabilityFee).toString()
                        : '',
                    eligibleBalance: tokensFetchedData[symbol]?.balanceE18 || '0',
                    myVaults: safeState.list.filter(({ collateralName }) => (
                        collateralName === symbol
                    )),
                }
            })
    }, [eligibleOnly, tokensData, tokensFetchedData, safeState.list, safeState.liquidationData])

    const filteredAvailableVaults = useMemo(() => {
        if (!eligibleOnly) return availableVaults

        return availableVaults.filter(({ collateralName }) => {
            const balance = tokensFetchedData[collateralName]?.balanceE18 || '0'
            return !BigNumber.from(balance).isZero()
        })
    }, [availableVaults, eligibleOnly])

    return (
        <NavContainer
            navItems={[
                `All Vaults (${availableVaults.length})`,
                `My Vaults (${safeState.list.length})`,
            ]}
            selected={navIndex}
            onSelect={(i: number) => setNavIndex(i)}
            headerContent={navIndex === 0
                ? (
                    <CheckboxButton
                        checked={eligibleOnly}
                        toggle={() => setEligibleOnly(e => !e)}>
                        Eligible Vaults Only
                    </CheckboxButton>
                )
                : (
                    <BrandedDropdown label={(
                        <Text
                            $fontWeight={400}
                            $textAlign="left"
                            style={{ width: '160px' }}>
                            Collateral Assets: <strong>{assetsFilter || 'All'}</strong>
                        </Text>
                    )}>
                        {assets.map(label => (
                            <DropdownOption
                                key={label}
                                onClick={() => {
                                    // e.stopPropagation()
                                    setAssetsFilter(label === 'All' ? undefined: label)
                                }}>
                                {label}
                            </DropdownOption>
                        ))}
                    </BrandedDropdown>
                )
            }>
            {navIndex === 0
                ? !filteredAvailableVaults.length
                    ? (
                        <CenteredFlex $width="100%">
                            <Text>No available vaults matched your search criteria</Text>
                        </CenteredFlex>
                    )
                    : <AvailableVaultsTable rows={filteredAvailableVaults}/>
                : (
                    <ProxyPrompt onCreateVault={!safeState.list.length
                        ? () => setActiveVault({
                            create: true,
                            collateralName: 'WETH',
                        })
                        : undefined
                    }>
                        <MyVaultsTable rows={myVaults}/>
                    </ProxyPrompt>
                )
            }
        </NavContainer>
    )
}
