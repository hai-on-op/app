import { useMemo, useRef, useState } from 'react'
import styled from 'styled-components'

import { Approvals, type HaiVeloApprovalItem } from './Approvals'
import { Execute } from './Execute'
import { Modal, type ModalProps } from '../index'
import { BrandedTitle } from '~/components/BrandedTitle'
import { X } from '~/components/Icons/X'
import { Flex, Text } from '~/styles'
import { Link } from '~/components/Link'
import { formatNumberWithStyle } from '~/utils'

type DiscountInfo = {
    loading: boolean
    marketRate: number
    discountPercent: number
    swapLink: string
}

type HaiVeloTxModalProps = ModalProps & {
    items: HaiVeloApprovalItem[]
    plan: {
        depositVeloWei?: string
        depositVeNftTokenIds?: string[]
        depositVeNftTotalWei?: string
        migrateV1Wei?: string
    }
    discount?: DiscountInfo
    onAllApproved: () => void
    onStepDone: (step: 'depositVelo' | 'depositVeNfts' | 'migrateV1') => void
}

export function HaiVeloTxModal({ items, plan, discount, onAllApproved, onStepDone, ...props }: HaiVeloTxModalProps) {
    const hasClosedRef = useRef(false)
    const [phase, setPhase] = useState<'approvals' | 'execute'>(items.length > 0 ? 'approvals' : 'execute')

    const handleClose = () => {
        if (hasClosedRef.current) return
        hasClosedRef.current = true
        props.onClose?.()
    }

    const content = useMemo(() => {
        if (phase === 'approvals') {
            return (
                <Approvals
                    items={items}
                    onAllApproved={() => {
                        setPhase('execute')
                    }}
                />
            )
        }
        return <Execute plan={plan} onDone={onAllApproved} onStepDone={onStepDone} />
    }, [phase, items, plan, onAllApproved, onStepDone])

    // Format the market rate info
    const marketRateDisplay = useMemo(() => {
        if (!discount || discount.loading) return null

        const { marketRate, discountPercent, swapLink } = discount
        const hasDiscount = discountPercent > 0

        return (
            <DiscountInfoWrapper>
                <DiscountInfoBox $hasDiscount={hasDiscount}>
                    <Flex $column $gap={4}>
                        <Text $fontSize="0.85em" $fontWeight={700}>
                            Market Rate: 1 VELO = {formatNumberWithStyle(marketRate, { maxDecimals: 4 })} haiVELO
                        </Text>
                        {hasDiscount ? (
                            <Text $fontSize="0.8em">
                                {formatNumberWithStyle(discountPercent, { maxDecimals: 2 })}% cheaper on Velodrome vs
                                minting 1:1
                            </Text>
                        ) : (
                            <Text $fontSize="0.8em">Minting at 1:1 is currently the best rate</Text>
                        )}
                    </Flex>
                    {hasDiscount && (
                        <Link href={swapLink} $textDecoration="none">
                            <SwapButton>Swap Instead</SwapButton>
                        </Link>
                    )}
                </DiscountInfoBox>
            </DiscountInfoWrapper>
        )
    }, [discount])

    return (
        <Modal
            onClose={handleClose}
            {...props}
            maxWidth={'720px'}
            ignoreWaiting={true}
            overrideContent={
                <>
                    <Modal.Header>
                        <BrandedTitle textContent="MINT haiVELO v2" $fontSize="2.5em" />
                        {props.onClose && (
                            <Modal.Close onClick={handleClose}>
                                <X size={14} />
                            </Modal.Close>
                        )}
                    </Modal.Header>
                    {marketRateDisplay}
                    {content}
                </>
            }
        />
    )
}

const DiscountInfoWrapper = styled.div`
    width: 100%;
    padding: 0 36px 16px;

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        padding: 0 16px 12px;
    `}
`

const DiscountInfoBox = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 12,
    ...props,
}))<{ $hasDiscount: boolean }>`
    padding: 12px 16px;
    background: ${({ $hasDiscount, theme }) =>
        $hasDiscount ? theme.colors.greenish : theme.colors.neutral};
    border: 2px solid rgba(0, 0, 0, 0.1);
    border-radius: 20px;
`

const SwapButton = styled.button`
    padding: 8px 16px;
    background: ${({ theme }) => theme.colors.greenish};
    color: ${({ theme }) => theme.colors.primary};
    border: ${({ theme }) => theme.border.medium};
    border-radius: 999px;
    font-weight: 700;
    font-size: 0.85em;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
        opacity: 0.85;
    }
`
