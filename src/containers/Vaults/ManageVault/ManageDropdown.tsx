import { useMemo } from 'react'

import { useStoreActions, useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'

import { CenteredFlex, Text } from '~/styles'
import { BrandedDropdown, DropdownOption } from '~/components/BrandedDropdown'
import { TokenPair } from '~/components/TokenPair'

export function ManageDropdown() {
    const {
        connectWalletModel: { tokensData },
        vaultModel: {
            list,
            vaultData,
        },
    } = useStoreState(state => state)
    const { vaultModel: vaultActions } = useStoreActions(actions => actions)

    const { vault, setActiveVault, updateForm, collateral } = useVault()

    const symbols = Object.values(tokensData || {})
        .filter(({ isCollateral }) => isCollateral)
        .map(({ symbol }) => symbol)

    const { label, options } = useMemo(() => {
        if (!vault) return {
            label: (
                <CenteredFlex $gap={8}>
                    <Text>{collateral.name} / HAI</Text>
                    <Text>•</Text>
                    <Text>{symbols.indexOf(collateral.name) + 1} of {symbols.length}</Text>
                </CenteredFlex>
            ),
            options: symbols.map(symbol => (
                <DropdownOption
                    key={symbol}
                    $active={symbol === collateral.name}
                    onClick={() => {
                        updateForm('clear')
                        vaultActions.setVaultData({
                            ...vaultData,
                            collateral: symbol,
                        })
                    }}>
                    {symbol}
                </DropdownOption>
            )),
        }
        return {
            label: (
                <CenteredFlex $gap={8}>
                    <Text>{collateral.name} / HAI</Text>
                    <Text $fontWeight={400}>#{vault.id}</Text>
                    <Text>•</Text>
                    <Text>{list.findIndex(({ id }) => id === vault.id) + 1} of {list.length}</Text>
                </CenteredFlex>
            ),
            options: list.map(listVault => (
                <DropdownOption
                    key={`${listVault.collateralName}-${listVault.id}`}
                    $active={listVault.id === vault.id}
                    onClick={() => setActiveVault({ vault })}>
                    #{listVault.id}
                </DropdownOption>
            )),
        }
    }, [vault, setActiveVault, updateForm, collateral, symbols, vaultActions])

    if (vault && !list.length) return null
    
    return (
        <BrandedDropdown
            style={{ paddingLeft: '8px' }}
            label={(<>
                <TokenPair
                    tokens={[collateral.name as any, 'HAI']}
                    hideLabel
                />
                {label}
            </>)}>
            {options}
        </BrandedDropdown>
    )
}
