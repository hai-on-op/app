import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount, useNetwork } from 'wagmi'

import type { ReactChildren } from '~/types'
import { useStoreActions, useStoreState } from '~/store'
import { ActionState, LINK_TO_DOCS, NETWORK_ID } from '~/utils'
import { handleTransactionError, useEthersSigner, useGeb, useTransactionAdder } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, HaiButton, Text } from '~/styles'
import { ConnectButton } from './ConnectButton'
import { Link } from './Link'

enum PromptStep {
    CONNECT_WALLET,
    CREATE_PROXY,
    CREATE_VAULT,
}

type ProxyPromptProps = {
    continueText?: string
    onCreateVault?: () => void
    onSuccess?: () => void
    connectWalletOnly?: boolean
    children: ReactChildren
}
export function ProxyPrompt({
    continueText = 'continue',
    onCreateVault,
    onSuccess,
    connectWalletOnly,
    children,
}: ProxyPromptProps) {
    const { t } = useTranslation()
    const { chain } = useNetwork()
    const chainId = chain?.id
    const { address: account } = useAccount()
    const signer = useEthersSigner()

    const geb = useGeb()

    const { connectWalletModel: connectWalletState } = useStoreState((state) => state)
    const { connectWalletModel: connectWalletActions, popupsModel: popupsActions } = useStoreActions(
        (actions) => actions
    )

    const addTransaction = useTransactionAdder()

    const handleCreateAccount = async () => {
        if (!account || !signer || !chainId) return false
        const txData = await geb.contracts.proxyFactory.populateTransaction['build()']()

        try {
            connectWalletActions.setIsStepLoading(true)
            popupsActions.setIsWaitingModalOpen(true)
            popupsActions.setWaitingPayload({
                title: 'Waiting For Confirmation',
                text: `Creating new account`,
                hint: 'Confirm this transaction in your wallet',
                status: ActionState.LOADING,
            })
            const txResponse = await signer.sendTransaction(txData)
            connectWalletActions.setCtHash(txResponse.hash)
            addTransaction(
                {
                    ...txResponse,
                    blockNumber: connectWalletState.blockNumber[chainId],
                },
                'Creating an account'
            )
            popupsActions.setWaitingPayload({
                title: 'Transaction Submitted',
                hash: txResponse.hash,
                status: ActionState.SUCCESS,
            })
            // wait some blocks before continue to the next step
            await txResponse.wait(5)

            popupsActions.setIsWaitingModalOpen(false)
            popupsActions.setWaitingPayload({ status: ActionState.NONE })
            connectWalletActions.setIsStepLoading(false)
            connectWalletActions.setStep(2)
            localStorage.removeItem('ctHash')
        } catch (e) {
            connectWalletActions.setIsStepLoading(false)
            handleTransactionError(e)
        }
    }

    useEffect(() => {
        if (!connectWalletState.ctHash) return
        if (onSuccess) {
            onSuccess()
        }
        popupsActions.setIsWaitingModalOpen(false)
        connectWalletActions.setIsStepLoading(false)
        connectWalletActions.setStep(2)
        localStorage.removeItem('ctHash')
    }, [connectWalletState.ctHash, popupsActions, connectWalletActions])

    if (connectWalletState.step === PromptStep.CONNECT_WALLET)
        return (
            <Container>
                <Text>Please connect a wallet to {continueText}</Text>
                <ConnectButton />
            </Container>
        )

    if (chain?.id !== NETWORK_ID)
        return (
            <Container>
                <Text>Please switch the connected network to {continueText}</Text>
                <ConnectButton />
            </Container>
        )

    if (!connectWalletOnly) {
        if (connectWalletState.step === PromptStep.CREATE_PROXY)
            return (
                <Container>
                    <Text>
                        To {continueText}, please create a proxy contract. A proxy contract allows for transaction
                        bundling as well as other unique features.&nbsp;
                        <Link href={`${LINK_TO_DOCS}detailed/proxies/hai_proxy.html`}>Read more →</Link>
                    </Text>
                    <HaiButton $variant="yellowish" onClick={handleCreateAccount}>
                        {t('create_account')}
                    </HaiButton>
                </Container>
            )

        if (onCreateVault && connectWalletState.step === PromptStep.CREATE_VAULT)
            return (
                <Container>
                    <Text>No active vaults associated with this address were found.</Text>
                    <HaiButton $variant="yellowish" onClick={onCreateVault}>
                        {t('create_vault')}
                    </HaiButton>
                </Container>
            )
    }

    return <>{children}</>
}

const Container = styled(CenteredFlex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $gap: 12,
    ...props,
}))`
    padding: 24px;
`
