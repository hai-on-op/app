import { useMemo } from 'react'

import { IVault, ReactChildren, TokenKey } from '~/types'
import { useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'

import styled from 'styled-components'
import { CenteredFlex, Flex, type FlexProps, HaiButton, Text } from '~/styles'
import { BrandedDropdown, DropdownOption } from '~/components/BrandedDropdown'
import { TokenArray } from '~/components/TokenArray'
import { Plus } from 'react-feather'
import { DEPRECATED_COLLATERALS } from '~/utils'

export function ManageDropdown(props: FlexProps) {
    const {
        connectWalletModel: { tokensData },
        vaultModel: { list },
    } = useStoreState((state) => state)

    const { vault, setActiveVault, updateForm, collateral } = useVault()

    const { label, options } = useMemo(() => {
        const symbols = Object.values(tokensData || {})
            .filter(({ isCollateral }) => isCollateral)
            .filter(({ symbol }) => !DEPRECATED_COLLATERALS.includes(symbol))
            .map(({ symbol }) => symbol)

        const sortedVaults = symbols.reduce(
            (obj, symbol) => {
                if (!obj[symbol]) obj[symbol] = []
                return obj
            },
            {} as Record<string, IVault[]>
        )
        list.forEach((listVault) => {
            if (!sortedVaults[listVault.collateralName]) sortedVaults[listVault.collateralName] = [listVault]
            else sortedVaults[listVault.collateralName].push(listVault)
        })
        return {
            label: (
                <CenteredFlex $gap={8}>
                    <Text>{collateral.name}</Text>
                    {!!vault && <Text $fontWeight={400}>#{vault.id}</Text>}
                    <Text>•</Text>
                    {vault ? (
                        <Text>
                            {list.findIndex(({ id }) => id === vault.id) + 1} of {list.length}
                        </Text>
                    ) : (
                        <Text>Open New</Text>
                    )}
                </CenteredFlex>
            ),
            options: Object.entries(sortedVaults).reduce((options, [symbol, vaults]) => {
                options.push(
                    <VaultDropdownContainer key={symbol}>
                        <VaultDropdownHeading>
                            <CenteredFlex $gap={8}>
                                <TokenArray tokens={[symbol as TokenKey]} hideLabel size={28} />
                                <Text>{symbol}</Text>
                            </CenteredFlex>
                            <IconButton
                                title={`Open New ${symbol} Vault`}
                                onClick={() => {
                                    setActiveVault({
                                        create: true,
                                        vault: undefined,
                                        collateralName: symbol,
                                    })
                                }}
                            >
                                <Plus size={16} />
                            </IconButton>
                        </VaultDropdownHeading>
                        {vaults.map((listVault) => (
                            <DropdownOption
                                key={`${listVault.collateralName}-${listVault.id}`}
                                $active={listVault.id === vault?.id}
                                onClick={() => setActiveVault({ vault: listVault })}
                            >
                                <CenteredFlex $gap={8}>
                                    <Text $fontWeight={400}>Vault</Text>
                                    <Text>#{listVault.id}</Text>
                                </CenteredFlex>
                            </DropdownOption>
                        ))}
                    </VaultDropdownContainer>
                )
                return options
            }, [] as ReactChildren[]),
        }
    }, [vault, setActiveVault, updateForm, collateral, tokensData])

    if (vault && !list.length) return null

    return (
        <BrandedDropdown
            width="200px"
            style={{ paddingLeft: '8px' }}
            label={
                <>
                    <TokenArray tokens={[collateral.name as any]} hideLabel />
                    {label}
                </>
            }
            maxHeight="max(calc(100vh - 400px), 200px)"
            innerPadding="0px"
            {...props}
        >
            {options}
        </BrandedDropdown>
    )
}

const IconButton = styled(HaiButton)`
    width: 28px;
    height: 28px;
    padding: 0px;
    justify-content: center;
    align-items: center;
`

const VaultDropdownContainer = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'stretch',
    $padding: '12px',
    $gap: 12,
    ...props,
}))`
    &:not(:first-child) {
        border-top: 1px solid rgba(0, 0, 0, 0.2);
    }
`
const VaultDropdownHeading = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 8,
    ...props,
}))``
