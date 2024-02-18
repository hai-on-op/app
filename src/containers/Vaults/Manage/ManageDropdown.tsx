import { useMemo } from 'react'

import { IVault, ReactChildren, TokenKey } from '~/types'
import { useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'

import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { BrandedDropdown, DropdownOption } from '~/components/BrandedDropdown'
import { TokenArray } from '~/components/TokenArray'
import { Plus } from 'react-feather'

export function ManageDropdown() {
    const {
        connectWalletModel: { tokensData },
        vaultModel: { list },
    } = useStoreState((state) => state)

    const { vault, setActiveVault, updateForm, collateral } = useVault()

    const { label, options } = useMemo(() => {
        const symbols = Object.values(tokensData || {})
            .filter(({ isCollateral }) => isCollateral)
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
                    <Flex $width="100%" $justify="space-between" $align="center" $gap={8}>
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
                    </Flex>
                )
                if (!vaults.length) {
                    options.push(<Separator />)
                    return options
                }
                const temp = options.concat(
                    vaults.map((listVault) => (
                        <DropdownOption
                            key={`${listVault.collateralName}-${listVault.id}`}
                            $active={listVault.id === vault?.id}
                            onClick={() => setActiveVault({ vault: listVault })}
                        >
                            {/* <TokenArray tokens={[listVault.collateralName as any]} hideLabel /> */}
                            <CenteredFlex $gap={8}>
                                <Text>Vault</Text>
                                <Text $fontWeight={400}>#{listVault.id}</Text>
                            </CenteredFlex>
                        </DropdownOption>
                    ))
                )
                temp.push(<Separator />)
                return temp
            }, [] as ReactChildren[]),
        }
    }, [vault, setActiveVault, updateForm, collateral, tokensData])

    if (vault && !list.length) return null

    return (
        <BrandedDropdown
            style={{ paddingLeft: '8px' }}
            label={
                <>
                    <TokenArray tokens={[collateral.name as any]} hideLabel />
                    {label}
                </>
            }
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

const Separator = styled.div`
    width: 100%;
    height: 2px;
    background: rgba(0, 0, 0, 0.1);
    flex-grow: 0;
    flex-shrink: 0;
`
