import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'

import { liquidateSafe } from '~/services/blockchain'
import { useStoreActions, useStoreState } from '~/store'
import { handleTransactionError, useGeb } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex } from '~/styles'
import Modal from './Modal'
import AlertLabel from '~/components/AlertLabel'
import Button from '~/components/Button'
import CheckBox from '~/components/CheckBox'

const LiquidateSafeModal = () => {
    const { t } = useTranslation()
    const geb = useGeb()
    const history = useHistory()

    const { popupsModel: popupsState } = useStoreState(state => state)
    const { popupsModel, transactionsModel } = useStoreActions(actions => actions)

    const [accepted, setAccepted] = useState(false)

    const closeModal = () => {
        setAccepted(false)
        popupsModel.closeLiquidateSafeModal()
    }

    const startSafeLiquidation = async () => {
        if (!popupsState.liquidateSafePayload || !geb) return
        const { safeId } = popupsState.liquidateSafePayload
        
        popupsModel.setIsWaitingModalOpen(true)
        popupsModel.setWaitingPayload({
            text: `Starting liquidation for safe #${safeId}...`,
            title: 'Waiting For Confirmation',
            hint: 'Confirm this transaction in your wallet',
            status: 'loading',
        })

        try {
            const txResponse = await liquidateSafe(geb, safeId)
            if (!txResponse) return
            const { hash, chainId, from } = txResponse
            transactionsModel.addTransaction({
                chainId,
                hash,
                from,
                summary: `Liquidate Safe #${safeId}`,
                addedTime: new Date().getTime(),
                originalTx: txResponse,
            })
            popupsModel.setWaitingPayload({
                title: 'Transaction Submitted',
                text: `Starting liquidation for safe #${safeId}...`,
                hash: txResponse.hash,
                status: 'loading',
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
            title="Liquidate Safe"
            maxWidth="400px"
            borderRadius="20px"
            isModalOpen={popupsState.isLiquidateSafeModalOpen}
            closeModal={closeModal}
            showXButton
            backDropClose>
            <AlertContainer>
                <AlertLabel
                    isBlock={false}
                    text={t('liquidate_safe_warning')}
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
                    onClick={startSafeLiquidation}>
                    {t('liquidate_button')}
                    {popupsState.liquidateSafePayload?.safeId}
                </Button>
            </ButtonContainer>
        </Modal>
    )
}

export default LiquidateSafeModal

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
