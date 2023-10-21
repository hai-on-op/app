import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { useAccount } from 'wagmi'

import { handleTransactionError, useEthersSigner, useGeb } from '@/hooks'
import TransactionOverview from '@/components/TransactionOverview'
import { useStoreActions, useStoreState } from '@/store'
import Button from '@/components/Button'
import Results from './Results'

const TxConfirmation = () => {
    const { t } = useTranslation()
    const { address: account } = useAccount()
    const signer = useEthersSigner()
    const { safeModel: safeState } = useStoreState((state) => state)
    const {
        popupsModel: popupsActions,
        safeModel: safeActions,
        connectWalletModel: connectWalletActions,
    } = useStoreActions((state) => state)
    const geb = useGeb()

    const handleBack = () => safeActions.setOperation(0)

    const reset = async () => {
        safeActions.setAmount('')
        safeActions.setOperation(0)
        popupsActions.setSafeOperationPayload({
            isOpen: false,
            type: '',
            isCreate: false,
        })

        if (account && geb) {
            connectWalletActions.fetchTokenData({ geb, user: account })
        }
    }

    const handleConfirm = async () => {
        try {
            if (account && signer) {
                popupsActions.setSafeOperationPayload({
                    isCreate: false,
                    isOpen: false,
                    type: '',
                })
                popupsActions.setIsWaitingModalOpen(true)
                popupsActions.setWaitingPayload({
                    title: 'Waiting For Confirmation',
                    text: 'Wrapping ETH',
                    hint: 'Confirm this transaction in your wallet',
                    status: 'loading',
                })

                await safeActions.wrapEther({
                    signer,
                    title: 'Wrapping ETH',
                    amount: safeState.amount,
                })
            }
            reset()
        } catch (e) {
            reset()
            handleTransactionError(e)
        }
    }

    return (
        <Container>
            <>
                <Body>
                    <TransactionOverview
                        title={t('confirm_transaction_details')}
                        description={t('confirm_details_text')}
                    />
                    <Results amount={safeState.amount} />
                </Body>

                <Footer>
                    <Button dimmedWithArrow text={t('back')} onClick={handleBack} />
                    <Button withArrow text={t('confirm_transaction')} onClick={handleConfirm} />
                </Footer>
            </>
        </Container>
    )
}

export default TxConfirmation

const Container = styled.div``

const Body = styled.div`
    padding: 20px;
`

const Footer = styled.div`
    display: flex;
    justify-content: space-between;
    padding: 20px;
`
