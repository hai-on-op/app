import { useEffect, useMemo, useState } from 'react'

import { ActionState, VaultAction, formatNumberWithStyle } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'
// import { formatCollateralLabel } from '~/utils'
import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { NumberInput } from '~/components/NumberInput'
// import { WrapETHModal } from '~/components/Modal/WrapETHModal'
import { ManageStakingError } from './ManageStakingError'
import { CheckBox } from '~/components/CheckBox'
// import { VaultTxModal } from '~/components/Modal/VaultTxModal'
import { StakingTxModal } from '~/components/Modal/StakingTxModal'

// import { Info } from '~/components/Icons/Info'
import { useBalances, useEthersSigner } from '~/hooks'
import { useStakingData } from '~/hooks/useStakingData'
import { useStakeAccount } from '~/hooks/staking/useStakeAccount'
import { useStakeStats } from '~/hooks/staking/useStakeStats'
import { useStakeMutations } from '~/hooks/staking/useStakeMutations'
import { useFlags } from 'flagsmith/react'
// import { Loader } from '~/components/Loader'
import { AvailabilityBadge } from '~/components/AvailabilityBadge'
// import { stakingModel } from '~/model/stakingModel'
import { formatTimeFromSeconds } from '~/utils/time'
import { useAccount } from 'wagmi'
import type { StakingConfig } from '~/types/stakingConfig'

type StakingSimulation = {
    stakingAmount: string
    unstakingAmount: string
    setStakingAmount: (amount: string) => void
    setUnstakingAmount: (amount: string) => void
}

type ManageStakingProps = {
    simulation: StakingSimulation
    config?: StakingConfig
}

export function ManageStaking({ simulation, config }: ManageStakingProps) {
    const flags = useFlags(['staking_refactor'])
    const useNew = true //!!flags.staking_refactor?.enabled
    const { stakingAmount, unstakingAmount, setStakingAmount, setUnstakingAmount } = simulation
    const [, kiteBalance] = useBalances(['HAI', 'KITE'])
    const stakingCtx = useStakingData() as any
    const stakingData = stakingCtx?.stakingData
    const cooldownPeriod = stakingCtx?.cooldownPeriod
    const stakingDataLoading = stakingCtx?.loading
    const refetchAll: (args?: any) => Promise<void> = stakingCtx?.refetchAll || (async () => {})
    const { address } = useAccount()
    const accountQuery = useStakeAccount(address as any)
    const statsQuery = useStakeStats()
    const mutations = useStakeMutations(address as any)
    const signer = useEthersSigner()

    const { stakingModel: stakingState } = useStoreState((state) => state)

    const tokenLabel = config?.labels.token || 'KITE'
    const stTokenLabel = config?.labels.stToken || 'stKITE'

    const availableKite = formatNumberWithStyle(kiteBalance.raw, {
        maxDecimals: 0,
    })

    const stakedKite = useMemo(() => {
        const bal = useNew ? accountQuery.data?.stakedBalance || '0' : stakingData.stakedBalance
        if (useNew ? accountQuery.isLoading : stakingDataLoading) return null
        return formatNumberWithStyle(bal, {
            maxDecimals: 2,
            minDecimals: 0,
        })
    }, [useNew, accountQuery.data?.stakedBalance, accountQuery.isLoading, stakingData.stakedBalance, stakingDataLoading])

    const pendingWithdrawal = useMemo(() => {
        if (!address) return null
        // Prefer React Query account data when available; fallback to StakingProvider model/indexer data
        const rqPending = useNew ? accountQuery.data?.pendingWithdrawal : null
        const modelPending = stakingState.pendingWithdrawals[address.toLowerCase()]
        const pW = rqPending || (stakingData?.pendingWithdrawal
            ? { amount: stakingData.pendingWithdrawal.amount, timestamp: stakingData.pendingWithdrawal.timestamp }
            : modelPending)
        if (!pW) return null
        const remainingTime = Number(pW.timestamp) + Number(cooldownPeriod) - Date.now() / 1000

        let availableIn
        if (remainingTime <= 0) {
            availableIn = 'now'
        } else if (remainingTime < 3600) {
            availableIn = `${Math.ceil(remainingTime / 60)} mins `
        } else if (remainingTime < 86400) {
            availableIn = `${Math.ceil(remainingTime / 3600)} hours`
        } else {
            availableIn = `${Math.ceil(remainingTime / 86400)} days`
        }

        return {
            amount: formatNumberWithStyle(pW.amount, {
                maxDecimals: 2,
                minDecimals: 2,
            }),
            availableIn,
        }
    }, [useNew, accountQuery.data?.pendingWithdrawal, cooldownPeriod, stakingState, stakingData?.pendingWithdrawal, address])

    const isUnStaking = Number(unstakingAmount) > 0
    const isStaking = Number(stakingAmount) > 0

    const {
        // vaultModel: vaultActions,
        popupsModel: { toggleModal },
        stakingModel: stakingActions,
        popupsModel: popupsActions,
    } = useStoreActions((actions) => actions)
    const { stakingModel: stakingStates } = useStoreState((state) => state)

    const { action, formState, collateral } = useVault()

    const isWithdraw = action === VaultAction.WITHDRAW_REPAY || action === VaultAction.WITHDRAW_BORROW
    // const isRepay = action === VaultAction.WITHDRAW_REPAY || action === VaultAction.DEPOSIT_REPAY

    const [reviewActive, setReviewActive] = useState(false)
    const [withdrawActive, setWithdrawActive] = useState(false)

    // Reset input values after a successful transaction
    const clearInputs = () => {
        setStakingAmount('')
        setUnstakingAmount('')
    }

    useEffect(() => {
        toggleModal({
            modal: 'reviewTx',
            isOpen: reviewActive,
        })
    }, [reviewActive, toggleModal])
    useEffect(() => {
        toggleModal({
            modal: 'withdraw',
            isOpen: withdrawActive,
        })
    }, [withdrawActive, toggleModal])

    /*if (stakingDataLoading) {
        return (
            <Container>
                <Header>
                    <Flex $width="100%" $justify="center" $align="center">
                        <Loader size={32} />
                    </Flex>
                </Header>
            </Container>
        )
    }*/

    return (
        <>
            {withdrawActive && (
                <StakingTxModal
                    isStaking={false}
                    amount={
                        isUnStaking
                            ? unstakingAmount
                            : isStaking
                                ? stakingAmount
                                : pendingWithdrawal
                                    ? pendingWithdrawal.amount
                                    : ''
                    }
                    stakedAmount={stakingData.stakedBalance}
                    onClose={() => {
                        clearInputs()
                        setWithdrawActive(false)
                        toggleModal({
                            modal: 'withdraw',
                            isOpen: false,
                        })
                    }}
                    onSuccess={clearInputs}
                    isWithdraw={true}
                />
            )}
            {reviewActive && (
                <StakingTxModal
                    isStaking={!isUnStaking}
                    amount={
                        isUnStaking
                            ? unstakingAmount
                            : isStaking
                                ? stakingAmount
                                : pendingWithdrawal
                                    ? pendingWithdrawal.amount
                                    : ''
                    }
                    stakedAmount={stakingData.stakedBalance}
                    onClose={() => {
                        setReviewActive(false)
                        toggleModal({
                            modal: 'reviewTx',
                            isOpen: false,
                        })
                    }}
                    onSuccess={clearInputs}
                    isWithdraw={false}
                />
            )}
            <Container>
                <Header>
                    <Flex $width="100%" $justify="space-between" $align="center">
                        <Text $fontWeight={700}>{`Manage ${tokenLabel} Staking`}</Text>
                        {(Number(stakingAmount) > 0 || Number(unstakingAmount) > 0) && (
                            <Text
                                $color="rgba(0,0,0,0.5)"
                                $fontSize="0.8em"
                                $textDecoration="underline"
                                onClick={clearInputs}
                                style={{ cursor: 'pointer' }}
                            >
                                Clear All
                            </Text>
                        )}
                    </Flex>
                </Header>
                <Body>
                    <NumberInput
                        label={
                            <CenteredFlex $gap={8}>
                                <CheckBox checked={!!stakingAmount && Number(stakingAmount) > 0} size={14} />
                                <Text>Stake</Text>
                            </CenteredFlex>
                        }
                        subLabel={`Max ${availableKite} ${tokenLabel}`}
                        placeholder="Staking Amount"
                        unitLabel={tokenLabel}
                        onChange={(value: string) => {
                            setUnstakingAmount('0')
                            setStakingAmount(value)
                        }}
                        value={stakingAmount}
                        onMax={() => {
                            setUnstakingAmount('0')
                            setStakingAmount(kiteBalance.raw.toString())
                        }}
                        conversion={
                            stakingAmount && Number(stakingAmount) > 0
                                ? `~${formatNumberWithStyle(
                                    parseFloat(collateral.priceInUSD || '0') * parseFloat(stakingAmount),
                                    { style: 'currency' }
                                )}`
                                : ''
                        }
                        style={!isWithdraw ? undefined : { opacity: 0.4 }}
                    />
                    <NumberInput
                        label={
                            <CenteredFlex $gap={8}>
                                <CheckBox checked={!!unstakingAmount && Number(unstakingAmount) > 0} size={14} />
                                <Text>Unstake</Text>
                            </CenteredFlex>
                        }
                        subLabel={`Max ${stakedKite} ${tokenLabel}`}
                        placeholder="Unstaking Amount"
                        unitLabel={stTokenLabel}
                        onChange={(value: string) => {
                            setStakingAmount('0')
                            setUnstakingAmount(value)
                        }}
                        value={unstakingAmount}
                        onMax={() => {
                            setStakingAmount('0')
                            setUnstakingAmount(stakingData.stakedBalance)
                        }}
                        conversion={
                            formState.deposit && Number(formState.deposit) > 0
                                ? `~${formatNumberWithStyle(
                                    parseFloat(collateral.priceInUSD || '0') * parseFloat(formState.deposit),
                                    { style: 'currency' }
                                )}`
                                : ''
                        }
                        style={!isWithdraw ? undefined : { opacity: 0.4 }}
                    />
                    <Text $fontSize="0.85em" $color="rgba(0,0,0,0.85)">
                        {stTokenLabel} has a {formatTimeFromSeconds(Number(stakingStates.cooldownPeriod))} cooldown
                        period after unstaking.
                    </Text>
                    {pendingWithdrawal && (
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                width: '100%',
                            }}
                        >
                            <Text $fontSize="0.85em">{`${pendingWithdrawal.amount} ${tokenLabel} available to claim in`}</Text>
                            <AvailabilityBadge>{`${pendingWithdrawal.availableIn}`}</AvailabilityBadge>
                            <HaiButton
                                $variant="yellowish"
                                $size="small"
                                onClick={async () => {
                                    if (pendingWithdrawal.availableIn === 'now') {
                                        setWithdrawActive(true)
                                        toggleModal({
                                            modal: 'withdraw',
                                            isOpen: true,
                                        })
                                    } else {
                                        try {
                                            popupsActions.setIsWaitingModalOpen(true)
                                            popupsActions.setWaitingPayload({
                                                title: 'Waiting For Confirmation',
                                                text: 'Cancel Withdrawal',
                                                hint: 'Confirm this transaction in your wallet',
                                                status: ActionState.LOADING,
                                            })

                                            await mutations.cancelWithdrawal.mutateAsync()

                                            popupsActions.setIsWaitingModalOpen(false)
                                            popupsActions.setWaitingPayload({ status: ActionState.NONE })
                                        } catch (error) {
                                            console.error('Failed to cancel withdrawal:', error)
                                        }
                                    }
                                }}
                            >
                                {pendingWithdrawal.availableIn === 'now' ? 'Claim' : 'Cancel'}
                            </HaiButton>
                        </div>
                    )}
                </Body>
                <Footer>
                    <ManageStakingError />
                    <HaiButton
                        $variant="yellowish"
                        $width="100%"
                        $justify="center"
                        disabled={
                            (Number(stakingAmount) <= 0 && Number(unstakingAmount) <= 0) ||
                            Number(stakingAmount) > Number(kiteBalance.raw) ||
                            Number(unstakingAmount) > Number(stakingData.stakedBalance)
                        }
                        onClick={() => {
                            setReviewActive(true)
                        }}
                    >
                        {isUnStaking ? 'Unstake' : 'Stake'}
                    </HaiButton>
                </Footer>
            </Container>
        </>
    )
}

const Container = styled(Flex).attrs((props) => ({
    $column: true,
    $shrink: 0,
    ...props,
}))`
    max-width: 100%;
    height: 592px;
    margin-bottom: -143px;
    background-color: #f7f1ff;
    border-radius: 24px;
    border: ${({ theme }) => theme.border.medium};

    ${({ theme }) => theme.mediaWidth.upToMedium`
        height: auto;
        min-height: 480px;
        margin-bottom: -119px;
    `}
`
const Header = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-end',
    $align: 'flex-start',
    $gap: 12,
    ...props,
}))`
    padding-top: 24px;
    padding-bottom: 20px;
    border-bottom: ${({ theme }) => theme.border.thin};

    & > *:first-child {
        padding: 0 24px;
    }
`
const Body = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 24,
    $grow: 1,
    $shrink: 1,
    ...props,
}))`
    height: 100%;
    padding: 24px;
    overflow: auto;
`
// const WrapEthText = styled(Text).attrs((props) => ({
//     $textAlign: 'right',
//     $color: 'rgba(0,0,0,0.5)',
//     $fontSize: '0.67em',
//     ...props,
// }))`
//     width: 100%;
//     margin-top: 8px;
//     cursor: pointer;
// `

const Footer = styled(CenteredFlex).attrs((props) => ({
    $column: true,
    $gap: 12,
    ...props,
}))`
    width: 100%;
    padding: 24px;
    border-top: ${({ theme }) => theme.border.thin};
`
