import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAccount } from 'wagmi'

import { ActionState, formatNumberWithStyle } from '~/utils'
import { useStoreActions } from '~/store'
import { useStaking } from '~/providers/StakingProvider'
import { useStakeMutations } from '~/hooks/staking/useStakeMutations'
import { buildStakingService } from '~/services/stakingService'

import styled from 'styled-components'
import { Flex, HaiButton, Text } from '~/styles'
import { ModalBody, ModalFooter } from '../index'
import { ArrowRightCircle, Check } from 'react-feather'
import { Loader } from '~/components/Loader'
import { TransactionSummary } from '~/components/TransactionSummary'
import type { StakingConfig } from '~/types/stakingConfig'

type StepKey = 'unstake' | 'withdraw'

type Step = {
    key: StepKey
    label: string
    run: () => Promise<void>
}

type InstantWithdrawExecuteProps = {
    amount: string
    stakedAmount: string
    onClose?: () => void
    onSuccess?: () => void
    config?: StakingConfig
}

export function InstantWithdrawExecute({
    amount,
    stakedAmount,
    onClose,
    onSuccess,
    config,
}: InstantWithdrawExecuteProps) {
    const { address } = useAccount()
    const { stakingModel: stakingActions } = useStoreActions((actions) => actions)
    const stakingCtx = useStaking()
    const refetchAll = stakingCtx?.refetchAll
        ? () => stakingCtx.refetchAll({})
        : () => Promise.resolve()

    const service = useMemo(
        () =>
            config
                ? buildStakingService(config.addresses.manager as `0x${string}`, undefined, config.decimals)
                : undefined,
        [config]
    )

    const { initiateWithdrawal, withdraw } = useStakeMutations(
        address as `0x${string}`,
        config?.namespace ?? 'kite',
        service
    )

    const [currentIndex, setCurrentIndex] = useState(0)
    const [pending, setPending] = useState(false)
    const [done, setDone] = useState<Record<StepKey, boolean>>({ unstake: false, withdraw: false })
    const [isComplete, setIsComplete] = useState(false)
    const hasClosedRef = useRef(false)

    const tokenLabel = config?.labels.token || 'KITE'

    // Snapshot initial staked amount for display
    const [initialStakedAmount] = useState(stakedAmount)

    useEffect(() => {
        return () => {
            hasClosedRef.current = true
        }
    }, [])

    const steps: Step[] = useMemo(() => {
        return [
            {
                key: 'unstake' as const,
                label: `Unstake ${formatNumberWithStyle(amount, { maxDecimals: 4 })} ${tokenLabel}`,
                run: async () => {
                    stakingActions.setTransactionState(ActionState.LOADING)
                    await initiateWithdrawal.mutateAsync(amount)
                    stakingActions.setTransactionState(ActionState.SUCCESS)
                },
            },
            {
                key: 'withdraw' as const,
                label: `Withdraw ${formatNumberWithStyle(amount, { maxDecimals: 4 })} ${tokenLabel}`,
                run: async () => {
                    stakingActions.setTransactionState(ActionState.LOADING)
                    await withdraw.mutateAsync()
                    stakingActions.setTransactionState(ActionState.SUCCESS)
                },
            },
        ]
    }, [amount, tokenLabel, initiateWithdrawal, withdraw, stakingActions])

    const handleRun = useCallback(async () => {
        const step = steps[currentIndex]
        if (!step) return
        setPending(true)
        try {
            await step.run()
            if (hasClosedRef.current) return

            setDone((d) => ({ ...d, [step.key]: true }))

            // Refresh staking data
            await refetchAll()
            if (hasClosedRef.current) return

            if (currentIndex < steps.length - 1) {
                setCurrentIndex((i) => i + 1)
            } else {
                setIsComplete(true)
            }
        } catch (e) {
            console.error('Failed execution step', e)
            stakingActions.setTransactionState(ActionState.ERROR)
        } finally {
            if (!hasClosedRef.current) {
                setPending(false)
            }
        }
    }, [steps, currentIndex, refetchAll, stakingActions])

    const handleDone = useCallback(() => {
        onSuccess?.()
        onClose?.()
    }, [onSuccess, onClose])

    const buttonLabel = useMemo(() => {
        if (isComplete) return 'Done'
        const step = steps[currentIndex]
        if (!step) return 'Done'
        switch (step.key) {
            case 'unstake':
                return 'Unstake'
            case 'withdraw':
                return 'Withdraw'
        }
    }, [steps, currentIndex, isComplete])

    const stepIcon = useCallback(
        (key: StepKey): JSX.Element | undefined => {
            const idx = steps.findIndex((s) => s.key === key)
            if (idx === -1) return undefined
            if (done[key]) return <Check width={16} className={ActionState.SUCCESS} />
            if (idx === currentIndex && pending) return <Loader size={16} color="#ff9d0a" />
            return <ArrowRightCircle width={16} className="stateless" />
        },
        [steps, done, currentIndex, pending]
    )

    const summaryItems = useMemo(() => {
        const amountNum = parseFloat(amount)
        const stakedNum = parseFloat(initialStakedAmount)
        const afterStaked = Math.max(0, stakedNum - amountNum)

        return [
            {
                label: `Unstake ${tokenLabel}`,
                value: {
                    current: formatNumberWithStyle(stakedNum, { maxDecimals: 4 }),
                    after: formatNumberWithStyle(afterStaked, { maxDecimals: 4 }),
                },
                icon: stepIcon('unstake'),
                isDone: done.unstake,
            },
            {
                label: `Withdraw ${tokenLabel}`,
                value: {
                    after: `+${formatNumberWithStyle(amountNum, { maxDecimals: 4 })} to wallet`,
                },
                icon: stepIcon('withdraw'),
                isDone: done.withdraw,
            },
        ]
    }, [amount, initialStakedAmount, tokenLabel, stepIcon, done])

    return (
        <>
            <ModalBody>
                <Flex $width="100%" $column $gap={12} $align="flex-start" $justify="flex-start">
                    <Description>
                        This staking contract has no cooldown period. Complete both steps below to unstake and
                        withdraw your {tokenLabel} immediately.
                    </Description>
                    <TransactionSummary heading="Withdrawal Steps" items={summaryItems} />
                </Flex>
            </ModalBody>
            <ModalFooter $gap={24} $justify="flex-end">
                <HaiButton $variant="yellowish" disabled={pending} onClick={isComplete ? handleDone : handleRun}>
                    {buttonLabel}
                </HaiButton>
            </ModalFooter>
        </>
    )
}

const Description = styled(Text)`
    ${({ theme }) => theme.mediaWidth.upToSmall`
        font-size: ${theme.font.small};
    `}
`

