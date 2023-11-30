import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowUpCircle, CheckCircle } from 'react-feather'
import { useTranslation } from 'react-i18next'
import { useAccount, useNetwork } from 'wagmi'

import { timeout } from '~/utils'
import { useStoreState, useStoreActions } from '~/store'
import {
    handlePreTxGasEstimate,
    handleTransactionError,
    useTransactionAdder,
    useEthersSigner,
    useGeb
} from '~/hooks'

import styled from 'styled-components'
import Modal from './Modal'
import Button from '~/components/Button'
import { Loader } from '~/components/Loader'

const ProxyModal = () => {
    const { t } = useTranslation()

    const { chain } = useNetwork()
    const { address: account } = useAccount()
    const signer = useEthersSigner()
    const chainId = chain?.id
    const geb = useGeb()

    const [status, setStatus] = useState('stateless')
    const addTransaction = useTransactionAdder()

    const {
        popupsModel: popupsState,
        connectWalletModel: connectWalletState
    } = useStoreState(state => state)
    const storeActions = useStoreActions(actions => actions)
    const {
        popupsModel: popupsActions,
        connectWalletModel: connectWalletActions
    } = storeActions

    const { ctHash } = connectWalletState

    useEffect(() => {
        if (!ctHash) return

        const blocksChecker = async () => {
            await timeout(2000)
            popupsActions.setIsProxyModalOpen(false)
            popupsState.returnProxyFunction(storeActions)
            localStorage.removeItem('ctHash')
            connectWalletActions.setCtHash('')
            connectWalletActions.setStep(2)
        }
        blocksChecker()
    }, [account, popupsActions, ctHash, popupsState, connectWalletActions, storeActions])

    const handleCreateAccount = async () => {
        if (!account || !signer || !chainId) return false

        const { blockNumber } = connectWalletState
        const txData = await geb.contracts.proxyRegistry.populateTransaction['build()']()

        try {
            setStatus('loading')
            popupsActions.setBlockBackdrop(true)
            const tx = await handlePreTxGasEstimate(signer, txData)
            const txResponse = await signer.sendTransaction(tx)
            connectWalletActions.setCtHash(txResponse.hash)
            addTransaction(
                {
                    ...txResponse,
                    blockNumber: blockNumber[chainId]
                },
                'Creating an account'
            )
            setStatus('success')
            await txResponse.wait()
        } catch (e) {
            handleTransactionError(e)
        } finally {
            popupsActions.setBlockBackdrop(false)
        }
    }

    const returnStatusIcon = (status: string) => {
        switch(status) {
            case 'success':
                return (
                    <CheckCircle
                        width="40px"
                        className={status}
                    />
                )
            case 'error':
                return (
                    <AlertTriangle
                        width="40px"
                        className={status}
                    />
                )
            case 'loading':
                return <Loader size={40}/>
            default:
                return (
                    <ArrowUpCircle
                        width="40px"
                        className="stateless"
                    />
                )
        }
    }

    return (
        <Modal
            maxWidth="400px"
            isModalOpen={popupsState.isProxyModalOpen}
            handleModalContent
            backDropClose={!popupsState.blockBackdrop}
            closeModal={() => popupsActions.setIsProxyModalOpen(false)}>
            <Container>
                <InnerContainer>
                    <ImgContainer>{returnStatusIcon(status)}</ImgContainer>
                    <Title className={status}>
                        {t('create_account')}
                    </Title>
                    <Text>{!ctHash && t('proxy_wallet_text')}</Text>

                    {!ctHash && (
                        <BtnContainer>
                            <Button
                                text={'create_account'}
                                onClick={handleCreateAccount}
                            />
                        </BtnContainer>
                    )}
                </InnerContainer>
            </Container>
        </Modal>
    )
}

export default ProxyModal

const Container = styled.div`
    max-width: 400px;
    background: ${({ theme }) => theme.colors.foreground};
    border-radius: 25px;
    margin: 0 auto;
`

const InnerContainer = styled.div`
    background: ${({ theme }) => theme.colors.background};
    text-align: center;
    border-radius: 20px;
    padding: 20px 20px 35px 20px;
`
const ImgContainer = styled.div`
    svg {
        margin: 25px auto;
        height: 40px;
        stroke: #4ac6b2;
        path {
            stroke-width: 1 !important;
        }
        &.stateless {
            stroke: orange;
        }
        &.success {
            stroke: #4ac6b2;
        }
        &.error {
            stroke: rgb(255, 104, 113);
            stroke-width: 2;
            width: 60px !important;
            height: 60px !important;
            margin-bottom: 20px;
        }
    }
`

const Title = styled.div`
    font-size: ${({ theme }) => theme.font.medium};
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 600;
    &.error {
        color: rgb(255, 104, 113);
        font-weight: normal;
    }
`

const Text = styled.div`
    font-size: ${({ theme }) => theme.font.small};
    color: ${({ theme }) => theme.colors.primary};
    margin: 10px 0;
`

const BtnContainer = styled.div`
    padding: 20px;
    margin: 20px -20px -35px;
    background-color: ${({ theme }) => theme.colors.background};
    border-radius: 0 0 20px 20px;
    text-align: center;
    svg {
        stroke: white;
        margin: 0;
    }
`
