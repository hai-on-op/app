import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpCircle, CheckCircle } from 'react-feather'
import { parseEther } from 'ethers/lib/utils'
import { utils as gebUtils } from '@hai-on-op/sdk'
import { useAccount } from 'wagmi'

import type { IAuction } from '~/types'
import { ActionState, timeout } from '~/utils'
import { useStoreState } from '~/store'
import { useTokenContract, useTransactionAdder, useGeb } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, HaiButton, Text } from '~/styles'
import { ModalBody, ModalFooter } from '../index'
import { Loader } from '~/components/Loader'
import { Caret } from '~/components/Icons/Caret'

export type ApproveMethod = 'systemCoin' | 'protocolToken'

type ApprovalsProps = {
    previousStep: () => void
    nextStep: () => void
    auction: IAuction
    method: ApproveMethod
}

export function Approvals({ previousStep, nextStep, auction, method }: ApprovalsProps) {
    const geb = useGeb()
    const { address: account } = useAccount()

    const {
        auctionModel: { amount },
        connectWalletModel: { proxyAddress },
    } = useStoreState((state) => state)

    const addTransaction = useTransactionAdder()
    const tokenContract = useTokenContract(geb?.contracts[method]?.address)

    const token = method === 'systemCoin' ? 'HAI' : 'KITE'
    const [status, setStatus] = useState({
        title: `${token} Allowance`,
        text: `Allow your account to manage your ${token}`,
        state: ActionState.NONE,
    })

    const checkForAllowance = async (allowance: string, amount: string) => {
        const allowanceBN = parseEther(allowance || '0')
        const amountBN = parseEther(amount || '0')
        if (!allowanceBN.gte(amountBN)) {
            setStatus({
                title: `${token} Allowance`,
                text: `Allow your account to manage your ${token}`,
                state: ActionState.NONE,
            })
            return
        }
        setStatus({
            title: `${token} Unlocked`,
            text: `${token} unlocked successfully, proceeding to review transaction...`,
            state: ActionState.SUCCESS,
        })
        await timeout(2000)
        nextStep()
    }

    const unlock = async () => {
        try {
            if (!account || !tokenContract) return false
            if (!proxyAddress) {
                throw new Error('No proxy address, disconnect your wallet and reconnect it again')
            }
            setStatus({
                title: 'Waiting for confirmation',
                text: 'Confirm this transaction in your wallet',
                state: ActionState.LOADING,
            })

            const approveAmount = auction.englishAuctionType === 'DEBT' ? auction.biddersList[0].buyAmount : amount

            const amountBN = parseEther(approveAmount)
            const txResponse = await tokenContract.approve(proxyAddress, amountBN)
            await txResponse.wait()
            const allowance = await tokenContract.allowance(account, proxyAddress)

            if (txResponse && allowance.toString()) {
                setStatus({
                    title: `Unlocking ${token}`,
                    text: `Confirming transaction and unlocking ${token}`,
                    state: ActionState.LOADING,
                })
                addTransaction(txResponse, `Unlocking ${token}`)

                checkForAllowance(allowance.toString(), amountBN.toString())
            }
        } catch (e: any) {
            if (e?.code === 4001) {
                setStatus({
                    title: 'Transaction Rejected.',
                    text: '',
                    state: ActionState.ERROR,
                })
                return
            }
            setStatus({
                title: e.message.includes('proxy') ? 'No Proxy Contract' : 'Transaction Failed.',
                text: '',
                state: ActionState.ERROR,
            })
            console.error(`Transaction failed`, e)
            console.log('Required String', gebUtils.getRequireString(e))
        }
    }

    const statusIcon = useMemo(() => {
        switch (status.state) {
            case ActionState.SUCCESS:
                return <CheckCircle width="40px" className={status.state} />
            case ActionState.ERROR:
                return <AlertTriangle width="40px" className={status.state} />
            case ActionState.LOADING:
                return <Loader size={40} />
            default:
                return <ArrowUpCircle width={'40px'} className={'stateless'} />
        }
    }, [status.state])

    return (
        <>
            <ModalBody>
                <ImageContainer>{statusIcon}</ImageContainer>
                <Text $fontWeight={700}>{status.title}</Text>
                <Text>{status.text}</Text>
            </ModalBody>
            <ModalFooter $gap={24}>
                <HaiButton $width="100%" disabled={status.state === ActionState.LOADING} onClick={previousStep}>
                    <Caret direction="left" strokeWidth={3} />
                    <CenteredFlex $width="100%">Go Back</CenteredFlex>
                </HaiButton>
                <HaiButton
                    $width="100%"
                    $justify="center"
                    $variant="yellowish"
                    disabled={status.state === ActionState.LOADING}
                    onClick={unlock}
                >
                    {status.state === ActionState.ERROR ? 'Try again' : 'Unlock'}
                </HaiButton>
            </ModalFooter>
        </>
    )
}

const ImageContainer = styled(CenteredFlex).attrs((props) => ({
    $width: '100%',
    ...props,
}))`
    svg {
        margin-top: 12px;
        height: 40px;
        stroke: ${({ theme }) => theme.colors.blueish};
        path {
            stroke-width: 1 !important;
        }
        &.${ActionState.NONE} {
            stroke: black;
        }
        &.${ActionState.SUCCESS} {
            stroke: ${({ theme }) => theme.colors.successColor};
        }
        &.${ActionState.ERROR} {
            stroke: ${({ theme }) => theme.colors.dangerColor};
            stroke-width: 2;
            width: 60px !important;
            height: 60px !important;
            margin-bottom: 20px;
        }
    }
`
