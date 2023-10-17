import { useState } from 'react'
import { AlertTriangle, ArrowUpCircle, CheckCircle } from 'react-feather'
import { utils as gebUtils } from '@hai-on-op/sdk'
import { utils as ethersUtils } from 'ethers'
import styled from 'styled-components'
import { useAccount } from 'wagmi'

import { useTokenContract, useTransactionAdder, useGeb } from '@/hooks'
import { useStoreActions, useStoreState } from '@/store'
import { AuctionEventType, IAuctionBidder } from '@/types'
import { timeout } from '@/utils'
import Button from './Button'
import Loader from './Loader'

export type ApproveMethod = 'systemCoin' | 'protocolToken'

interface Props {
    handleBackBtn: () => void
    handleSuccess: () => void
    bids: IAuctionBidder[]
    amount: string
    allowance: string
    methodName: ApproveMethod
    coinName: string
    auctionType: AuctionEventType
}

const ApproveToken = ({ bids, amount, handleBackBtn, handleSuccess, methodName, coinName, auctionType }: Props) => {
    const TEXT_PAYLOAD_DEFAULT_STATE = {
        title: `${coinName} Allowance`,
        text: `Allow your account to manage your ${coinName}`,
        status: '',
    }

    const geb = useGeb()
    const tokenContract = useTokenContract(geb?.contracts[methodName].address)
    const [textPayload, setTextPayload] = useState(TEXT_PAYLOAD_DEFAULT_STATE)
    const { address: account } = useAccount()

    const addTransaction = useTransactionAdder()
    const { connectWalletModel: connectWalletState, popupsModel: popupsState } = useStoreState((state) => state)
    const { popupsModel: popupsActions } = useStoreActions((state) => state)

    const { proxyAddress } = connectWalletState

    const returnStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle width={'40px'} className={status} />
            case 'error':
                return <AlertTriangle width={'40px'} className={status} />
            case 'loading':
                return <Loader width={'40px'} />
            default:
                return <ArrowUpCircle width={'40px'} className={'stateless'} />
        }
    }

    const passedCheckForAllowance = async (allowance: string, amount: string, isPaid: boolean) => {
        if (!isPaid) return
        const allowanceBN = allowance ? ethersUtils.parseEther(allowance) : ethersUtils.parseEther('0')
        const amountBN = ethersUtils.parseEther(amount)
        if (allowanceBN.gte(amountBN)) {
            setTextPayload({
                title: `${coinName} Unlocked`,
                text: `${coinName} unlocked successfully, proceeding to review transaction...`,
                status: 'success',
            })
            await timeout(2000)
            handleSuccess()
            popupsActions.setBlockBackdrop(false)
        } else {
            setTextPayload(TEXT_PAYLOAD_DEFAULT_STATE)
            popupsActions.setBlockBackdrop(false)
        }
    }

    const unlockRAI = async () => {
        try {
            if (!account || !tokenContract) return false
            if (!proxyAddress) {
                throw new Error('No proxy address, disconnect your wallet and reconnect it again')
            }
            popupsActions.setBlockBackdrop(true)
            setTextPayload({
                title: 'Waiting for confirmation',
                text: 'Confirm this transaction in your wallet',
                status: 'loading',
            })

            let approveAmount: string
            if (auctionType === 'SURPLUS' || auctionType === 'COLLATERAL') {
                approveAmount = amount
            } else {
                approveAmount = bids[0].buyAmount
            }

            const amountBN = ethersUtils.parseEther(approveAmount)
            const txResponse = await tokenContract.approve(proxyAddress, amountBN)
            await txResponse.wait()
            const allowance = await tokenContract.allowance(account, proxyAddress)

            if (txResponse && allowance.toString()) {
                setTextPayload({
                    title: `Unlocking ${coinName}`,
                    text: `Confirming transaction and unlocking ${coinName}`,
                    status: 'loading',
                })
                addTransaction(txResponse, `Unlocking ${coinName}`)

                passedCheckForAllowance(allowance.toString(), amountBN.toString(), true)
            }
        } catch (e: any) {
            popupsActions.setBlockBackdrop(false)
            if (e?.code === 4001) {
                setTextPayload({
                    title: 'Transaction Rejected.',
                    text: '',
                    status: 'error',
                })
                return
            }
            setTextPayload({
                title: e.message.includes('proxy') ? 'No Proxy Contract' : 'Transaction Failed.',
                text: '',
                status: 'error',
            })
            console.error(`Transaction failed`, e)
            console.log('Required String', gebUtils.getRequireString(e))
        }
    }

    return (
        <Container>
            <InnerContainer>
                {popupsState.blockBackdrop ? null : (
                    <BackContainer>
                        <Button dimmedWithArrow text={'back'} onClick={handleBackBtn} />
                    </BackContainer>
                )}
                <ImgContainer>{returnStatusIcon(textPayload.status)}</ImgContainer>
                <Title>{textPayload.title}</Title>

                {textPayload.text ? <Text className={textPayload.status}>{textPayload.text}</Text> : null}

                {!textPayload.status || textPayload.status === 'error' ? (
                    <BtnContainer>
                        <Button text={textPayload.status === 'error' ? 'Try again' : 'Unlock'} onClick={unlockRAI} />
                    </BtnContainer>
                ) : null}
            </InnerContainer>
        </Container>
    )
}

export default ApproveToken

const Container = styled.div`
    max-width: 400px;
    background: ${(props) => props.theme.colors.foreground};
    border-radius: 25px;
    margin: 0 auto;
`

const InnerContainer = styled.div`
    background: ${(props) => props.theme.colors.foreground};
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
    font-size: ${(props) => props.theme.font.medium};
    color: ${(props) => props.theme.colors.primary};
    font-weight: 600;
    &.error {
        color: rgb(255, 104, 113);
        font-weight: normal;
    }
`

const Text = styled.div`
    font-size: ${(props) => props.theme.font.small};
    color: ${(props) => props.theme.colors.primary};
    margin: 10px 0;
`

const BtnContainer = styled.div`
    padding: 20px;
    margin: 20px -20px -38px;
    background-color: ${(props) => props.theme.colors.background};
    border-radius: 0 0 20px 20px;
    text-align: center;
    svg {
        stroke: white;
        margin: 0;
    }
`

const BackContainer = styled.div``
