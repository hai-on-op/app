import { useRef } from 'react'
import { CSSTransition, SwitchTransition } from 'react-transition-group'
import { useTranslation } from 'react-i18next'

import { COIN_TICKER } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'

import styled from 'styled-components'
import ApproveToken from '~/components/ApproveToken'
import AuctionsTransactions from './AuctionsTransactions'
import AuctionsPayment from './AuctionsPayment'

const AuctionsOperations = () => {
    const { t } = useTranslation()
    const nodeRef = useRef(null)
    const { auctionModel: auctionsActions } = useStoreActions((state) => state)
    const {
        auctionModel: {
            amount = '0',
            operation,
            selectedAuction: surplusOrDebtAuction,
            selectedCollateralAuction,
        },
        popupsModel: popupsState,
        connectWalletModel: {
            coinAllowance: raiCoinAllowance = '0',
            protAllowance: flxAllowance = '0',
        },
    } = useStoreState(state => state)

    const selectedAuction = surplusOrDebtAuction
        ? surplusOrDebtAuction
        : selectedCollateralAuction

    const {
        englishAuctionType: auctionType = 'DEBT',
        englishAuctionBids: bids = [],
    } = selectedAuction as any

    const returnBody = () => {
        switch (operation) {
            case 0:
                return <AuctionsPayment />
            case 2:
                return <AuctionsTransactions />
            default:
                break
        }
    }

    return (
        <SwitchTransition mode="out-in">
            <CSSTransition
                nodeRef={nodeRef}
                key={operation}
                timeout={250}
                classNames="fade">
                <Fade
                    ref={nodeRef}
                    style={{
                        width: '100%',
                        maxWidth: '720px',
                    }}>
                    {operation === 1
                        ? (
                            <ApproveToken
                                handleBackBtn={() => auctionsActions.setOperation(0)}
                                handleSuccess={() => auctionsActions.setOperation(2)}
                                amount={amount}
                                bids={bids}
                                allowance={auctionType === 'DEBT' || auctionType === 'COLLATERAL'
                                    ? raiCoinAllowance
                                    : flxAllowance
                                }
                                coinName={auctionType === 'DEBT' || auctionType === 'COLLATERAL'
                                    ? (COIN_TICKER as string)
                                    : 'KITE'
                                }
                                methodName={auctionType === 'DEBT' || auctionType === 'COLLATERAL'
                                    ? 'systemCoin'
                                    : 'protocolToken'
                                }
                                auctionType={auctionType}
                            />
                        )
                        : (
                            <ModalContent
                                style={{
                                    width: '100%',
                                    maxWidth: '720px',
                                }}>
                                <Header>
                                    {t(popupsState.auctionOperationPayload.type, {
                                        hai: COIN_TICKER,
                                    })}
                                </Header>
                                {returnBody()}
                            </ModalContent>
                        )
                    }
                </Fade>
            </CSSTransition>
        </SwitchTransition>
    )
}

export default AuctionsOperations

const ModalContent = styled.div`
    background: ${(props) => props.theme.colors.background};
    border-radius: ${(props) => props.theme.global.borderRadius};
    border: 1px solid ${(props) => props.theme.colors.border};
`

const Header = styled.div`
    padding: 20px;
    font-size: ${(props) => props.theme.font.large};
    font-weight: 600;
    color: ${(props) => props.theme.colors.primary};
    border-bottom: 1px solid ${(props) => props.theme.colors.border};
    letter-spacing: -0.47px;
    span {
        text-transform: capitalize;
    }
`

const Fade = styled.div`
    &.fade-enter {
        opacity: 0;
        transform: translateX(50px);
    }
    &.fade-enter-active {
        opacity: 1;
        transform: translateX(0);
    }
    &.fade-exit {
        opacity: 1;
        transform: translateX(0);
    }
    &.fade-exit-active {
        opacity: 0;
        transform: translateX(-50px);
    }
    &.fade-enter-active,
    &.fade-exit-active {
        transition:
            opacity 300ms,
            transform 300ms;
    }
`
