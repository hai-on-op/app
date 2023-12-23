import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'

import { ActionState } from '~/utils'
import { liquidateVault } from '~/services/blockchain'
import { useStoreActions, useStoreState } from '~/store'
import { handleTransactionError, useGeb } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex } from '~/styles'
import Modal from './Modal'
import AlertLabel from '~/components/AlertLabel'
import Button from '~/components/Button'
import { CheckBox } from '~/components/CheckBox'

const LiquidateVaultModal = () => {
    const { t } = useTranslation()
    const geb = useGeb()
    const history = useHistory()

    const { popupsModel: popupsState } = useStoreState(state => state)
    const { popupsModel, transactionsModel } = useStoreActions(actions => actions)

    const [accepted, setAccepted] = useState(false)

    const closeModal = () => {
        setAccepted(false)
        popupsModel.closeLiquidateVaultModal()
    }

    const startVaultLiquidation = async () => {
        if (!popupsState.liquidateVaultPayload || !geb) return
        const { vaultId } = popupsState.liquidateVaultPayload
        
        popupsModel.setIsWaitingModalOpen(true)
        popupsModel.setWaitingPayload({
            text: `Starting liquidation for vault #${vaultId}...`,
            title: 'Waiting For Confirmation',
            hint: 'Confirm this transaction in your wallet',
            status: ActionState.LOADING,
        })

        try {
            const txResponse = await liquidateVault(geb, vaultId)
            if (!txResponse) return
            const { hash, chainId, from } = txResponse
            transactionsModel.addTransaction({
                chainId,
                hash,
                from,
                summary: `Liquidate Vault #${vaultId}`,
                addedTime: new Date().getTime(),
                originalTx: txResponse,
            })
            popupsModel.setWaitingPayload({
                title: 'Transaction Submitted',
                text: `Starting liquidation for vault #${vaultId}...`,
                hash: txResponse.hash,
                status: ActionState.LOADING,
            })
            await txResponse.wait()
            popupsModel.setIsWaitingModalOpen(false)
            history.push('/vaults')
            closeModal()
        } catch(error: any) {
            handleTransactionError(error)
        }
    }

    return (
        <Modal
            title="Liquidate Vault"
            maxWidth="400px"
            borderRadius="20px"
            isModalOpen={popupsState.isLiquidateVaultModalOpen}
            closeModal={closeModal}
            showXButton
            backDropClose>
            <AlertContainer>
                <AlertLabel
                    isBlock={false}
                    text={t('liquidate_vault_warning')}
                    type="danger"
                />
            </AlertContainer>
            <CheckboxContainer>
                <CheckBox
                    checked={accepted}
                    onChange={setAccepted}
                />
                <span onClick={() => setAccepted(!accepted)}>
                    {t('liquidate_confirmation')}
                </span>
            </CheckboxContainer>
            <ButtonContainer>
                <Button
                    disabled={!accepted}
                    onClick={startVaultLiquidation}>
                    {t('liquidate_button')}
                    {popupsState.liquidateVaultPayload?.vaultId}
                </Button>
            </ButtonContainer>
        </Modal>
    )
}

export default LiquidateVaultModal

const AlertContainer = styled.div`
    margin-bottom: 20px;

    & > div {
        font-size: 13px;
        ${({ theme }) => theme.mediaWidth.upToSmall`
            margin-left: 0px;
        `}
    }
    
    ${({ theme }) => theme.mediaWidth.upToSmall`
        margin: 12px 0;
    `}
`

const CheckboxContainer = styled(CenteredFlex)`
    margin-bottom: 20px;
    gap: 12px;

    & > span {
        position: relative;
        font-size: 13px;
        top: -3px;
    }
`

const ButtonContainer = styled.div`
    button {
        width: 100%;
    }
`
