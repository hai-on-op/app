import { useEffect } from 'react'

import type { ReactChildren } from '~/types'
import { formatNumberWithStyle } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'

import styled from 'styled-components'
import { BlurContainer, CenteredFlex, Flex, Text } from '~/styles'
import { BrandedDropdown, DropdownOption } from '~/components/BrandedDropdown'
import { RewardsTokenPair, TokenPair } from '~/components/TokenPair'
import { ProxyPrompt } from '~/components/ProxyPrompt'
import { Overview } from './Overview'
import { VaultActions } from './VaultActions'

type ManageVaultProps = {
    headerContent?: ReactChildren,
}
export function ManageVault({ headerContent }: ManageVaultProps) {
    const {
        connectWalletModel: { tokensData },
        safeModel: {
            safeData,
            singleSafe,
        },
    } = useStoreState(state => state)
    const { safeModel: safeActions } = useStoreActions(actions => actions)

    const { updateForm, collateral, debt } = useVault()

    // clear form inputs when unmounting
    useEffect(() => () => updateForm('clear'), [updateForm])

    const relativePrice = parseFloat(collateral.priceInUSD || '0') / parseFloat(debt.priceInUSD)

    const symbols = Object.values(tokensData || {})
        .filter(({ isCollateral }) => isCollateral)
        .map(({ symbol }) => symbol)
    const onCollateralSelect = (collateralName: string) => {
        updateForm('clear')
        safeActions.setSafeData({
            ...safeData,
            collateral: collateralName,
        })
    }

    return (
        <Container>
            <Header>
                <CenteredFlex $gap={12}>
                    {!singleSafe && (
                        <BrandedDropdown
                            label={(<>
                                <TokenPair
                                    tokens={[collateral.name as any, 'HAI']}
                                    hideLabel
                                />
                                <CenteredFlex $gap={8}>
                                    <Text>{collateral.name} / HAI</Text>
                                    <Text>•</Text>
                                    <Text>{symbols.indexOf(collateral.name) + 1} of {symbols.length}</Text>
                                </CenteredFlex>
                            </>)}
                            style={{ paddingLeft: '8px' }}>
                            {symbols.map(symbol => (
                                <DropdownOption
                                    key={symbol}
                                    $active={symbol === collateral.name}
                                    onClick={() => onCollateralSelect(symbol)}>
                                    {symbol}
                                </DropdownOption>
                            ))}
                        </BrandedDropdown>
                    )}
                    <RewardsTokenPair tokens={['OP']}/>
                </CenteredFlex>
                <Text>
                    Market Price:&nbsp;
                    <strong>
                        {relativePrice
                            ? formatNumberWithStyle(relativePrice.toString(), { maxDecimals: 2 })
                            : '--'
                        } HAI / {collateral.name}
                    </strong>
                </Text>
                {headerContent}
            </Header>
            <Body>
                <ProxyPrompt>
                    <Overview/>
                    <VaultActions/>
                </ProxyPrompt>
            </Body>
        </Container>
    )
}

const Container = styled(BlurContainer)`
    width: 100%;
    margin-bottom: 48px;
`

const Header = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 24,
    ...props,
}))`
    position: relative;
    padding: 24px 48px;
    border-bottom: ${({ theme }) => theme.border.medium};
    z-index: 1;
`

const Body = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'flex-start',
    $gap: 48,
    ...props,
}))`
    padding: 48px;
`
