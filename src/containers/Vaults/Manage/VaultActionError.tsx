import { VaultAction, VaultInfoError } from '~/utils'
import { useVault } from '~/providers/VaultProvider'

import styled from 'styled-components'
import { CenteredFlex, Text } from '~/styles'

export function VaultActionError() {
    const { action, formState, error, errorMessage } = useVault()

    if (!error) return null

    if (error === VaultInfoError.ZERO_AMOUNT) {
        if (action === VaultAction.CREATE) {
            // ignore error on initial form state
            if (!formState.deposit || !formState.borrow) return null
        }
        else if (action === VaultAction.DEPOSIT_BORROW) {
            // ignore single-sided empty error
            if (!formState.deposit || !formState.borrow) return null
        }
        else if (action === VaultAction.WITHDRAW_REPAY) {
            // ignore single-sided empty error
            if (!formState.withdraw || !formState.repay) return null
        }
    }

    return (
        <Container>
            <Text
                $fontSize="0.8em"
                $color="red">
                Error: {errorMessage}
            </Text>
        </Container>
    )
}

const Container = styled(CenteredFlex)`
    width: 100%;
    margin-top: 24px;
`
