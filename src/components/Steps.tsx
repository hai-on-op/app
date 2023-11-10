import { useEffect } from 'react'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'
import { useAccount, useNetwork } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'

import { handleTransactionError, useTransactionAdder, useGeb, useEthersSigner } from '~/hooks'
import { useStoreActions, useStoreState } from '~/store'
import StepsContent from './StepsContent'
import { COIN_TICKER } from '~/utils'

const Steps = () => {
    const { t } = useTranslation()
    const { chain } = useNetwork()
    const chainId = chain?.id
    const { address: account } = useAccount()
    const signer = useEthersSigner()
    const { openConnectModal } = useConnectModal()
    const handleConnectWallet = () => openConnectModal && openConnectModal()

    const geb = useGeb()

    const history = useHistory()
    const { connectWalletModel: connectWalletState } = useStoreState((state) => state)

    const { popupsModel: popupsActions, connectWalletModel: connectWalletActions } = useStoreActions((state) => state)

    const addTransaction = useTransactionAdder()

    const { step, isWrongNetwork, isStepLoading, blockNumber } = connectWalletState

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
                status: 'loading',
            })
            const txResponse = await signer.sendTransaction(txData)
            connectWalletActions.setCtHash(txResponse.hash)
            addTransaction({ ...txResponse, blockNumber: blockNumber[chainId] }, 'Creating an account')
            popupsActions.setWaitingPayload({
                title: 'Transaction Submitted',
                hash: txResponse.hash,
                status: 'success',
            })
            // wait some blocks before continue to the next step
            await txResponse.wait(5)

            popupsActions.setIsWaitingModalOpen(false)
            connectWalletActions.setIsStepLoading(false)
            connectWalletActions.setStep(2)
            localStorage.removeItem('ctHash')
        } catch (e) {
            connectWalletActions.setIsStepLoading(false)
            handleTransactionError(e)
        }
    }

    const handleCreateSafe = () => {
        history.push('/safes/create')
    }

    const returnSteps = (stepNumber: number) => {
        switch (stepNumber) {
            case 0:
                return (
                    <StepsContent
                        stepNumber={0}
                        id="step0"
                        title={'getting_started'}
                        text={'getting_started_text'}
                        btnText={'connect_wallet'}
                        handleClick={handleConnectWallet}
                        isDisabled={isWrongNetwork}
                        isLoading={isStepLoading}
                    />
                )
            case 1:
                return (
                    <StepsContent
                        stepNumber={1}
                        id="step1"
                        title={'create_account'}
                        text={'create_account_text'}
                        btnText={'create_account'}
                        handleClick={handleCreateAccount}
                        isDisabled={isWrongNetwork}
                        isLoading={isStepLoading}
                    />
                )
            case 2:
                return (
                    <StepsContent
                        stepNumber={2}
                        id="step2"
                        title={'create_safe'}
                        text={t('create_safe_text', {
                            coin_ticker: COIN_TICKER,
                        })}
                        btnText={'create_safe'}
                        handleClick={handleCreateSafe}
                        isDisabled={isWrongNetwork}
                        isLoading={isStepLoading}
                    />
                )
            default:
                break
        }
    }

    useEffect(() => {
        if (connectWalletState.ctHash) {
            popupsActions.setIsWaitingModalOpen(false)
            connectWalletActions.setIsStepLoading(false)
            connectWalletActions.setStep(2)
            localStorage.removeItem('ctHash')
        }
    }, [])

    return (
        <StepsContainer>
            <StepsBars>
                {step !== 0 ? (
                    <>
                        <StepBar className={step !== 0 ? 'active' : ''} />
                        <StepBar className={step === 2 ? 'active' : ''} />
                    </>
                ) : null}
            </StepsBars>
            {returnSteps(step)}
        </StepsContainer>
    )
}

export default Steps

const StepsContainer = styled.div`
    margin-top: 20px;
    .__react_component_tooltip {
        max-width: 250px;
        padding-top: 20px;
        padding-bottom: 20px;
        border-radius: 5px;
        opacity: 1 !important;
        background: ${(props) => props.theme.colors.background};
        border: ${(props) => props.theme.colors.border};
        box-shadow: 0 0 6px rgba(0, 0, 0, 0.16);
    }
`

const StepsBars = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
`

const StepBar = styled.div`
    width: 68px;
    height: 4px;
    border-radius: 10px;
    background: ${(props) => props.theme.colors.placeholder};
    &.active {
        background: ${(props) => props.theme.colors.gradient};
    }
    margin-right: 8px;
    &:last-child {
        margin-right: 0;
    }
`

const Confirmations = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    margin-top: 10px;
    font-size: ${(props) => props.theme.font.extraSmall};
    font-weight: 600;
    color: ${(props) => props.theme.colors.secondary};
`

const InfoBtn = styled.div`
    cursor: pointer;
    background: ${(props) => props.theme.colors.secondary};
    color: #fff;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 7px;
`
