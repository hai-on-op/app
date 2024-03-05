import { VaultAction, VaultInfoError } from '~/utils'
import { useVault } from '~/providers/VaultProvider'

import styled from 'styled-components'
import { CenteredFlex, Text } from '~/styles'

export function VaultActionError() {
    const { action, formState, error, errorMessage } = useVault()

    if (!error) return null

    if (error === VaultInfoError.ZERO_AMOUNT) {
        switch (action) {
            case VaultAction.CREATE:
            case VaultAction.DEPOSIT_BORROW:
                if (!formState.deposit || !formState.borrow) return null
                break
            case VaultAction.DEPOSIT_REPAY:
                if (!formState.deposit || !formState.repay) return null
                break
            case VaultAction.WITHDRAW_BORROW:
                if (!formState.withdraw || !formState.borrow) return null
                break
            case VaultAction.WITHDRAW_REPAY:
                if (!formState.withdraw || !formState.repay) return null
                break
        }
    }

    return (
        <Container>
            <Text $fontSize="0.8em" $color="red" $textAlign="left">
                Error: {errorMessage}
            </Text>
        </Container>
    )
}

const Container = styled(CenteredFlex)`
    width: 100%;
    & > * {
        width: fit-content;
    }
`
