import { useStoreState } from '~/store'

import styled, { css } from 'styled-components'
import { Text } from '~/styles'
import { BrandedDropdown, DropdownOption } from './BrandedDropdown'
import { TokenArray } from './TokenArray'
import { DEPRECATED_COLLATERALS } from '~/utils'

type CollateralDropdownProps = {
    label: string
    selectedAsset?: string
    onSelect: (asset?: string) => void
    excludeAll?: boolean
}
export function CollateralDropdown({ label, selectedAsset, onSelect, excludeAll = false }: CollateralDropdownProps) {
    const {
        connectWalletModel: { tokensData },
    } = useStoreState((state) => state)

    const symbols = Object.values(tokensData || {})
        .filter(({ isCollateral }) => isCollateral)
        .filter(({ symbol }) => !DEPRECATED_COLLATERALS.includes(symbol))
        .map(({ symbol }) => symbol)

    return (
        <BrandedDropdown
            label={
                <Text $fontWeight={400} $textAlign="left">
                    {label}
                    {': '}
                    <strong>{selectedAsset || 'All'}</strong>
                </Text>
            }
        >
            {(excludeAll ? symbols : ['All', ...symbols]).map((token) => (
                <Option
                    key={token}
                    $pad={token !== 'All'}
                    $active={token === 'All' ? !selectedAsset : selectedAsset === token}
                    onClick={() => onSelect(token === 'All' ? undefined : token)}
                >
                    {token !== 'All' && <TokenArray tokens={[token as any]} hideLabel />}
                    <Text>{token}</Text>
                </Option>
            ))}
        </BrandedDropdown>
    )
}

const Option = styled(DropdownOption)<{ $pad?: boolean }>`
    ${({ $pad }) =>
        !!$pad &&
        css`
            padding-left: 8px;
        `}
`
