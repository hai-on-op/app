import { ActionState, ChainId } from '~/utils'
import { claimAirdropVelo } from '~/services/blockchain'
import { useStoreActions, useStoreState } from '~/store'
import { handleTransactionError, useEthersSigner } from '~/hooks'

import { CenteredFlex, HaiButton } from '~/styles'
import { ProxyPrompt } from '~/components/ProxyPrompt'

export function TestClaimVelo() {
    const signer = useEthersSigner({ chainId: ChainId.OPTIMISM_SEPOLIA })

    const { popupsModel: popupsState } = useStoreState((state) => state)
    const {
        connectWalletModel: connectWalletActions,
        popupsModel: popupsActions,
        transactionsModel,
    } = useStoreActions((actions) => actions)

    const handleClaimAirdrop = async () => {
        if (!signer || popupsState.waitingPayload.status === ActionState.LOADING) return
        popupsActions.setIsWaitingModalOpen(true)
        popupsActions.setWaitingPayload({
            text: 'Claiming test velo...',
            title: 'Waiting For Confirmation',
            hint: 'Confirm this transaction in your wallet',
            status: ActionState.LOADING,
        })

        try {
            const txResponse = await claimAirdropVelo(signer)
            if (!txResponse) return

            transactionsModel.addTransaction({
                chainId: txResponse.chainId,
                hash: txResponse.hash,
                from: txResponse.from,
                summary: 'Claiming test velo',
                addedTime: new Date().getTime(),
                originalTx: txResponse,
            })
            popupsActions.setWaitingPayload({
                title: 'Transaction Submitted',
                hash: txResponse.hash,
                status: ActionState.SUCCESS,
            })
            await txResponse.wait()
            connectWalletActions.setForceUpdateTokens(true)
            popupsActions.setIsWaitingModalOpen(false)
            popupsActions.setWaitingPayload({ status: ActionState.NONE })
        } catch (err: any) {
            handleTransactionError(err)
        }
    }

    return (
        <CenteredFlex $width="max(300px, 65%)" style={{ zIndex: 1 }}>
            <ProxyPrompt continueText="claim test velo">
                <HaiButton
                    $variant="yellowish"
                    disabled={!signer || popupsState.waitingPayload.status === ActionState.LOADING}
                    onClick={handleClaimAirdrop}
                >
                    {!signer ? 'Connect Valid Wallet' : 'Claim Test velo'}
                </HaiButton>
            </ProxyPrompt>
        </CenteredFlex>
    )
}
