import styled, { css } from 'styled-components'
import { Text } from '~/styles'
import { BrandedDropdown, DropdownOption } from './BrandedDropdown'
import { TokenArray } from './TokenArray'

type CollateralDropdownProps = {
    label: string
    selectedAsset?: string
    onSelect: (asset?: string) => void
    symbols: string[]
    excludeAll?: boolean
}
export function CollateralDropdown({
    label,
    selectedAsset,
    onSelect,
    symbols,
    excludeAll = false,
}: CollateralDropdownProps) {
    const options = Array.from(new Set(symbols))

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
            {(excludeAll ? options : ['All', ...options]).map((token) => (
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
