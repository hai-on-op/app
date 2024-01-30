import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from 'wagmi'

import { ActionState, COIN_TICKER, formatNumberWithStyle } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { handleTransactionError, useEthersSigner } from '~/hooks'

import { ModalBody, ModalFooter } from '../index'
import { CenteredFlex, HaiButton } from '~/styles'
import { Caret } from '~/components/Icons/Caret'
import { TransactionSummary } from '~/components/TransactionSummary'

enum ActionType {
    BID,
    BUY,
    CLAIM,
    SETTLE,
}

type ConfirmProps = {
    previousStep: () => void
}
export function Confirm({ previousStep }: ConfirmProps) {
    const { t } = useTranslation()
    const { address: account } = useAccount()
    const signer = useEthersSigner()

    const {
        auctionModel: auctionState,
        popupsModel: {
            auctionOperationPayload: { type },
        },
    } = useStoreState((state) => state)
    const { auctionModel: auctionActions, popupsModel: popupsActions } = useStoreActions((actions) => actions)

    const [status, setStatus] = useState<ActionState>(ActionState.NONE)

    const actionType = useMemo(() => {
        if (type.includes('claim')) return ActionType.CLAIM
        if (type.includes('settle')) return ActionType.SETTLE
        if (type.includes('buy')) return ActionType.BUY
        return ActionType.BID
    }, [type])

    const title = useMemo(() => {
        switch (auctionState.selectedAuction?.englishAuctionType) {
            case 'DEBT': {
                switch (actionType) {
                    case ActionType.SETTLE:
                        return 'Claiming KITE'
                    case ActionType.CLAIM:
                        return 'Claiming Tokens'
                    default:
                        return `Bid ${COIN_TICKER} and Receive KITE`
                }
            }
            case 'SURPLUS': {
                switch (actionType) {
                    case ActionType.SETTLE:
                        return 'Claiming HAI'
                    case ActionType.CLAIM:
                        return 'Claiming Tokens'
                    default:
                        return `Bid KITE and Receive ${COIN_TICKER}`
                }
            }
            case 'COLLATERAL':
                return 'Buying Collateral'
            default:
                return ''
        }
    }, [auctionState.selectedAuction, actionType])

    const summaryItems = useMemo(() => {
        if (!auctionState.selectedAuction) return {}

        switch (actionType) {
            case ActionType.SETTLE:
                return {}
            case ActionType.CLAIM:
                return {
                    Claim:
                        Number(auctionState.internalBalance) > 0
                            ? `${formatNumberWithStyle(auctionState.internalBalance)} KITE`
                            : `${formatNumberWithStyle(auctionState.protInternalBalance)} HAI`,
                }
            default: {
                const {
                    amount,
                    collateralAmount,
                    selectedAuction: { englishAuctionType, buyToken, buyInitialAmount, sellToken, sellInitialAmount },
                } = auctionState
                switch (englishAuctionType) {
                    case 'COLLATERAL':
                        return {
                            Bid: `${formatNumberWithStyle(amount, { maxDecimals: 7 })} ${buyToken}`,
                            'Amount to Receive': `${formatNumberWithStyle(collateralAmount, {
                                maxDecimals: 7,
                            })} ${sellToken}`,
                        }
                    case 'DEBT':
                        return {
                            Bid: `${formatNumberWithStyle(buyInitialAmount, { maxDecimals: 7 })} ${buyToken}`,
                            'Amount to Receive': `${formatNumberWithStyle(amount, { maxDecimals: 7 })} ${sellToken}`,
                        }
                    case 'SURPLUS':
                        return {
                            Bid: `${formatNumberWithStyle(sellInitialAmount, { maxDecimals: 7 })} ${sellToken}`,
                            'Amount to Receive': `${formatNumberWithStyle(amount, { maxDecimals: 7 })} ${buyToken}`,
                        }
                }
            }
        }
    }, [auctionState, actionType])

    const handleConfirm = async () => {
        if (!account || !signer || !auctionState.selectedAuction) return

        setStatus(ActionState.LOADING)
        try {
            popupsActions.setAuctionOperationPayload({
                isOpen: false,
                type: '',
                auctionType: '',
            })
            popupsActions.setIsWaitingModalOpen(true)
            popupsActions.setWaitingPayload({
                title: 'Waiting For Confirmation',
                text: title,
                hint: 'Confirm this transaction in your wallet',
                status: ActionState.LOADING,
            })

            const {
                selectedAuction: { auctionId, englishAuctionType: auctionType, sellToken },
                amount,
                collateralAmount,
                internalBalance,
                protInternalBalance,
            } = auctionState

            switch (actionType) {
                case ActionType.BUY: {
                    await auctionActions.auctionBuy({
                        signer,
                        auctionId,
                        title,
                        haiAmount: amount,
                        collateral: sellToken,
                        collateralAmount,
                    })
                    break
                }
                case ActionType.SETTLE: {
                    await auctionActions.auctionClaim({
                        signer,
                        auctionId,
                        title,
                        auctionType,
                    })
                    break
                }
                case ActionType.CLAIM: {
                    await auctionActions.auctionClaimInternalBalance({
                        signer,
                        auctionId,
                        title,
                        auctionType,
                        bid: Number(internalBalance) > 0 ? internalBalance : protInternalBalance,
                        token: Number(internalBalance) > 0 ? 'COIN' : 'PROTOCOL_TOKEN',
                    })
                    break
                }
                case ActionType.BID: {
                    await auctionActions.auctionBid({
                        signer,
                        auctionId,
                        title,
                        auctionType,
                        bid: amount,
                    })
                    break
                }
            }
            setStatus(ActionState.NONE)
        } catch (e) {
            setStatus(ActionState.ERROR)
            handleTransactionError(e)
        }
    }

    return (
        <>
            <ModalBody>
                <TransactionSummary
                    items={[
                        {
                            label: 'Auction #',
                            value: {
                                after: auctionState.selectedAuction?.auctionId || '?',
                            },
                        },
                        {
                            label: 'Type',
                            value: {
                                after: auctionState.selectedAuction?.englishAuctionType || '?',
                            },
                        },
                        ...Object.entries(summaryItems).map(([label, value]) => ({
                            label,
                            value: { after: value },
                        })),
                    ]}
                />
            </ModalBody>
            <ModalFooter $gap={24}>
                <HaiButton $width="100%" disabled={status === ActionState.LOADING} onClick={previousStep}>
                    <Caret direction="left" strokeWidth={3} />
                    <CenteredFlex $width="100%">Go Back</CenteredFlex>
                </HaiButton>
                <HaiButton
                    $width="100%"
                    $justify="center"
                    $variant="yellowish"
                    disabled={status === ActionState.LOADING || !account || !signer || !auctionState.selectedAuction}
                    onClick={handleConfirm}
                >
                    {status === ActionState.ERROR ? 'Try Again' : t('confirm_transaction')}
                </HaiButton>
            </ModalFooter>
        </>
    )
}
