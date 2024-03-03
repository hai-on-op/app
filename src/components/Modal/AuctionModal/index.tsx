import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useStoreActions, useStoreState } from '~/store'

import { Modal, type ModalProps } from '../index'
import { BrandedTitle } from '~/components/BrandedTitle'
import { X } from '~/components/Icons/X'
import { ConfigureAction } from './ConfigureAction'
import { Approvals } from './Approvals'
import { Confirm } from './Confirm'

enum AuctionActionStep {
    CONFIGURE,
    APPROVE,
    CONFIRM,
}

export function AuctionModal({ maxWidth = '600px', onClose, ...props }: ModalProps) {
    const { t } = useTranslation()

    const {
        auctionModel: { selectedAuction },
        popupsModel: {
            auctionOperationPayload: { isOpen, type },
        },
    } = useStoreState((state) => state)
    const { auctionModel: auctionActions } = useStoreActions((actions) => actions)

    const [step, setStep] = useState(AuctionActionStep.CONFIGURE)

    const content = useMemo(() => {
        if (!selectedAuction) return null

        switch (step) {
            case AuctionActionStep.CONFIGURE:
                return (
                    <ConfigureAction
                        auction={selectedAuction}
                        action={type}
                        nextStep={(skip?: boolean) =>
                            setStep(!skip ? AuctionActionStep.APPROVE : AuctionActionStep.CONFIRM)
                        }
                    />
                )
            case AuctionActionStep.APPROVE:
                return (
                    <Approvals
                        auction={selectedAuction}
                        method={selectedAuction.englishAuctionType === 'SURPLUS' ? 'protocolToken' : 'systemCoin'}
                        previousStep={() => setStep(AuctionActionStep.CONFIGURE)}
                        nextStep={() => setStep(AuctionActionStep.CONFIRM)}
                    />
                )
            case AuctionActionStep.CONFIRM:
                return <Confirm previousStep={() => setStep(AuctionActionStep.CONFIGURE)} />
        }
    }, [step, selectedAuction, type])

    useEffect(() => {
        if (isOpen)
            return () => {
                setStep(AuctionActionStep.CONFIGURE)
                auctionActions.setAmount('')
                auctionActions.setCollateralAmount('')
            }
    }, [isOpen, auctionActions])

    if (!isOpen) return null

    return (
        <Modal
            onClose={onClose}
            {...props}
            maxWidth={step === AuctionActionStep.APPROVE ? '420px' : maxWidth}
            overrideContent={
                <>
                    <Modal.Header>
                        <BrandedTitle textContent={t(type).toUpperCase()} $fontSize="2.5em" />
                        {onClose && (
                            <Modal.Close onClick={onClose}>
                                <X size={14} />
                            </Modal.Close>
                        )}
                    </Modal.Header>
                    {content}
                </>
            }
        />
    )
}
