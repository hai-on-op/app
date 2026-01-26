import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount, useNetwork, useSwitchNetwork } from 'wagmi'

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
    /** Additional chain IDs that are allowed (e.g., Base for haiAERO minting) */
    allowedChainIds?: number[]
    /** Name of the target network for display (e.g., "Optimism") - used when user needs to switch networks */
    targetNetworkName?: string
}
export function ProxyPrompt({
    continueText = 'continue',
    onCreateVault,
    onSuccess,
    connectWalletOnly,
    children,
    allowedChainIds = [],
    targetNetworkName = 'Optimism',
}: ProxyPromptProps) {
    const { t } = useTranslation()
    const { chain } = useNetwork()
    const chainId = chain?.id
    const { address: account } = useAccount()
    const { switchNetwork } = useSwitchNetwork()
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
    }, [connectWalletState.ctHash, popupsActions, connectWalletActions, onSuccess])

    // Check if user is on an allowed chain (primary network or any additional allowed chains)
    const isOnAllowedChain = chain?.id === NETWORK_ID || allowedChainIds.includes(chain?.id ?? 0)

    // Check wallet connection first - use account from wagmi directly instead of step
    // (step is not properly set when on "wrong" networks like Base for haiAERO)
    if (!account)
        return (
            <Container>
                <Text>Please connect a wallet to {continueText}</Text>
                <ConnectButton />
            </Container>
        )

    // Then check network
    if (!isOnAllowedChain)
        return (
            <Container>
                <Text>Please switch to {targetNetworkName} to {continueText}</Text>
                <HaiButton $variant="yellowish" onClick={() => switchNetwork?.(NETWORK_ID)}>
                    Switch to {targetNetworkName}
                </HaiButton>
            </Container>
        )

    // Skip proxy/vault checks when on alternative allowed chains (e.g., Base for haiAERO)
    // Proxies are only on the primary network (Optimism)
    const isOnPrimaryNetwork = chain?.id === NETWORK_ID
    if (!connectWalletOnly && isOnPrimaryNetwork) {
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
