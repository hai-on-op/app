import styled from 'styled-components'
import { DashedContainerStyle, type DashedContainerProps, Flex, Text } from '~/styles'

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/

type AddressSearchProps = {
    value: string
    onChange: (address: string) => void
    hasMatch: boolean | null // null = no search yet, true = found, false = not found
}

export function AddressSearch({ value, onChange, hasMatch }: AddressSearchProps) {
    const isValid = value === '' || ADDRESS_REGEX.test(value)

    return (
        <Container>
            <SearchInput
                type="text"
                placeholder="Enter 0x address to view rewards..."
                value={value}
                onChange={(e) => onChange(e.target.value.trim())}
                spellCheck={false}
                autoComplete="off"
            />
            {value && !isValid && (
                <Text $fontSize="0.8rem" $color="#ef4444">
                    Invalid address format
                </Text>
            )}
            {value && isValid && hasMatch === false && (
                <Text $fontSize="0.8rem" $color="#f59e0b">
                    Address not found in rewards data
                </Text>
            )}
        </Container>
    )
}

const Container = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $gap: 8,
    ...props,
}))``

const SearchInput = styled.input<DashedContainerProps>`
    ${DashedContainerStyle}
    width: 100%;
    padding: 16px 20px;
    font-size: 1rem;
    font-family: inherit;
    background: rgba(255, 255, 255, 0.08);
    border: none;
    color: ${({ theme }) => theme.colors.primary};
    outline: none;

    &::placeholder {
        color: ${({ theme }) => theme.colors.primary};
        opacity: 0.4;
    }

    &::after {
        opacity: 0.3;
    }
`
