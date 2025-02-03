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
import { useBalances } from '~/hooks'
import { useStakingData } from '~/hooks/useStakingData'
import { Loader } from '~/components/Loader'

export function ManageStaking() {
    const [haiBalance, kiteBalance] = useBalances(['HAI', 'KITE'])
    const { stakingData, loading: stakingDataLoading } = useStakingData()

    const [stakingAmount, setStakingAmount] = useState('')
    const [unstakingAmount, setUnstakingAmount] = useState('')

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
        return {
            amount: formatNumberWithStyle(stakingData.pendingWithdrawal.amount, {
                maxDecimals: 2,
                minDecimals: 2,
            }),
            availableIn:
                stakingData.pendingWithdrawal.status === 'COMPLETED'
                    ? 'now'
                    : `${Math.ceil(
                          (Number(stakingData.pendingWithdrawal.timestamp) + 21 * 24 * 60 * 60 - Date.now() / 1000) /
                              (24 * 60 * 60)
                      )} days`,
        }
    }, [stakingData.pendingWithdrawal])

    const isUnStaking = Number(unstakingAmount) > 0

    const {
        vaultModel: vaultActions,
        popupsModel: { toggleModal },
    } = useStoreActions((actions) => actions)

    const { vault, action, setAction, formState, updateForm, collateral, debt, summary, error } = useVault()

    const isWithdraw = action === VaultAction.WITHDRAW_REPAY || action === VaultAction.WITHDRAW_BORROW
    const isRepay = action === VaultAction.WITHDRAW_REPAY || action === VaultAction.DEPOSIT_REPAY

    const [reviewActive, setReviewActive] = useState(false)
    const [wrapEthActive, setWrapEthActive] = useState(false)
    useEffect(() => {
        toggleModal({
            modal: 'reviewTx',
            isOpen: reviewActive,
        })
    }, [reviewActive, toggleModal])
    useEffect(() => {
        toggleModal({
            modal: 'wrapETH',
            isOpen: wrapEthActive,
        })
    }, [wrapEthActive, toggleModal])

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
            {reviewActive && (
                <StakingTxModal
                    isStaking={!isUnStaking}
                    amount={isUnStaking ? unstakingAmount : stakingAmount}
                    stakedAmount={stakingData.stakedBalance}
                    onClose={() => {
                        setReviewActive(false)
                    }}
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
                                onClick={() => {
                                    setStakingAmount('')
                                    setUnstakingAmount('')
                                }}
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
                                <CheckBox checked={!isWithdraw} size={14} />
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
                                <CheckBox checked={!isWithdraw} size={14} />
                                <Text>Unstake</Text>
                            </CenteredFlex>
                        }
                        subLabel={`Max ${stakedKite} KITE`}
                        placeholder="Untaking Amount"
                        unitLabel={'sKITE'}
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
                        sKITE has a 21 day cooldown period after unstaking.
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
                            <Text $fontSize="0.85em">{`${pendingWithdrawal.amount} KITE available to claim in ${pendingWithdrawal.availableIn}`}</Text>
                            <HaiButton $variant="yellowish" disabled>Claim</HaiButton>
                        </div>
                    )}
                </Body>
                <Footer>
                    <ManageStakingError />
                    <HaiButton
                        $variant="yellowish"
                        $width="100%"
                        $justify="center"
                        disabled={Number(stakingAmount) <= 0 && Number(unstakingAmount) <= 0}
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
