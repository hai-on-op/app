import { useEffect, useMemo, useState } from 'react'

import { ActionState, VaultAction, formatNumberWithStyle } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'
import { formatCollateralLabel } from '~/utils'
import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { NumberInput } from '~/components/NumberInput'
import { WrapETHModal } from '~/components/Modal/WrapETHModal'
import { ManageStakingError } from './ManageStakingError'
import { CheckBox } from '~/components/CheckBox'
import { VaultTxModal } from '~/components/Modal/VaultTxModal'
import { StakingTxModal } from '~/components/Modal/StakingTxModal'

import { Info } from '~/components/Icons/Info'
import { useBalances, useEthersSigner } from '~/hooks'
import { useStakingData } from '~/hooks/useStakingData'
import { Loader } from '~/components/Loader'
import { AvailabilityBadge } from '~/components/AvailabilityBadge'
import { stakingModel } from '~/model/stakingModel'
import { formatTimeFromSeconds, secondsToDays } from '~/utils/time'

type StakingSimulation = {
    stakingAmount: string
    unstakingAmount: string
    setStakingAmount: (amount: string) => void
    setUnstakingAmount: (amount: string) => void
}

type ManageStakingProps = {
    simulation: StakingSimulation
}

export function ManageStaking({ simulation }: ManageStakingProps) {
    const { stakingAmount, unstakingAmount, setStakingAmount, setUnstakingAmount } = simulation
    const [haiBalance, kiteBalance] = useBalances(['HAI', 'KITE'])
    const { stakingData, cooldownPeriod, loading: stakingDataLoading, refetchAll } = useStakingData()
    const signer = useEthersSigner()

    const availableKite = formatNumberWithStyle(kiteBalance.raw, {
        maxDecimals: 0,
    })

    const stakedKite = useMemo(() => {
        if (stakingDataLoading) return null
        return formatNumberWithStyle(stakingData.stakedBalance, {
            maxDecimals: 2,
            minDecimals: 2,
        })
    }, [stakingData.stakedBalance, stakingDataLoading])

    const pendingWithdrawal = useMemo(() => {
        if (!stakingData.pendingWithdrawal) return null

        const remainingTime =
            Number(stakingData.pendingWithdrawal.timestamp) + Number(cooldownPeriod) - Date.now() / 1000

        let availableIn
        if (remainingTime <= 0) {
            availableIn = 'now'
        } else if (remainingTime < 3600) {
            // less than 1 hour
            availableIn = `${Math.ceil(remainingTime / 60)} mins `
        } else if (remainingTime < 86400) {
            // less than 1 day
            availableIn = `${Math.ceil(remainingTime / 3600)} hours`
        } else {
            availableIn = `${Math.ceil(remainingTime / 86400)} days`
        }

        return {
            amount: formatNumberWithStyle(stakingData.pendingWithdrawal.amount, {
                maxDecimals: 2,
                minDecimals: 2,
            }),
            availableIn,
        }
    }, [stakingData.pendingWithdrawal, cooldownPeriod])

    const isUnStaking = Number(unstakingAmount) > 0
    const isStaking = Number(stakingAmount) > 0

    const {
        vaultModel: vaultActions,
        popupsModel: { toggleModal },
        stakingModel: stakingActions,
        popupsModel: popupsActions,
    } = useStoreActions((actions) => actions)
    const { stakingModel: stakingStates } = useStoreState((state) => state)

    const { vault, action, setAction, formState, updateForm, collateral, debt, summary, error } = useVault()

    const isWithdraw = action === VaultAction.WITHDRAW_REPAY || action === VaultAction.WITHDRAW_BORROW
    const isRepay = action === VaultAction.WITHDRAW_REPAY || action === VaultAction.DEPOSIT_REPAY

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

    if (stakingDataLoading) {
        return (
            <Container>
                <Header>
                    <Flex $width="100%" $justify="center" $align="center">
                        <Loader size={32} />
                    </Flex>
                </Header>
            </Container>
        )
    }

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
                        <Text $fontWeight={700}>Manage KITE Staking</Text>
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
                        subLabel={`Max ${availableKite} KITE`}
                        placeholder="Staking Amount"
                        unitLabel={'KITE'}
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
                        subLabel={`Max ${stakedKite} KITE`}
                        placeholder="Unstaking Amount"
                        unitLabel={'stKITE'}
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
                        stKITE has a {formatTimeFromSeconds(Number(stakingStates.cooldownPeriod))} cooldown period after
                        unstaking.
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
                            <Text $fontSize="0.85em">{`${pendingWithdrawal.amount} KITE available to claim in`}</Text>
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
                                        if (!signer) return
                                        try {
                                            popupsActions.setIsWaitingModalOpen(true)
                                            popupsActions.setWaitingPayload({
                                                title: 'Waiting For Confirmation',
                                                text: 'Cancel Withdrawal',
                                                hint: 'Confirm this transaction in your wallet',
                                                status: ActionState.LOADING,
                                            })

                                            await stakingActions.cancelWithdrawal({ signer })

                                            await refetchAll({ cancelWithdrawalAmount: pendingWithdrawal.amount })
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
                        onClick={() => setReviewActive(true)}
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
const WrapEthText = styled(Text).attrs((props) => ({
    $textAlign: 'right',
    $color: 'rgba(0,0,0,0.5)',
    $fontSize: '0.67em',
    ...props,
}))`
    width: 100%;
    margin-top: 8px;
    cursor: pointer;
`

const Footer = styled(CenteredFlex).attrs((props) => ({
    $column: true,
    $gap: 12,
    ...props,
}))`
    width: 100%;
    padding: 24px;
    border-top: ${({ theme }) => theme.border.thin};
`
