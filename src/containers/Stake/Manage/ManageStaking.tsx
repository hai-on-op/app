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

import { Info } from '~/components/Icons/Info'

export function ManageStaking() {
    const [stakingAmount, setStakingAmount] = useState('')
    const [unstakingAmount, setUnstakingAmount] = useState('')

    const availableKite = 726.12
    const stakedKite = 4828.42

    const pendingUnstakes = [
        {
            amount: 101,
            availableIn: '19 days',
        },
        {
            amount: 1037,
            availableIn: 'now',
        },
    ]

    const isUnStaking = Number(unstakingAmount) > 0 ? true : false

    const { vaultModel: vaultState } = useStoreState((state) => state)
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

    const [buttonActive, buttonLabel] = useMemo(() => {
        let label = ''
        switch (action) {
            case VaultAction.CREATE: {
                const { deposit = '0', borrow = '0' } = formState
                if (Number(deposit) <= 0 || Number(borrow) <= 0) {
                    return [false, 'Open Vault']
                }
                label = 'Open Vault'
                break
            }
            case VaultAction.DEPOSIT_BORROW: {
                const { deposit = '0', borrow = '0' } = formState
                if (Number(deposit) <= 0 && Number(borrow) <= 0) {
                    return [false, 'Deposit']
                }
                if (Number(borrow) <= 0) label = 'Deposit'
                else if (Number(deposit) <= 0) label = 'Borrow'
                else label = 'Deposit & Borrow'
                break
            }
            case VaultAction.DEPOSIT_REPAY: {
                const { deposit = '0', repay = '0' } = formState
                if (Number(deposit) <= 0 && Number(repay) <= 0) {
                    return [false, 'Deposit']
                }
                if (Number(repay) <= 0) label = 'Deposit'
                else if (Number(deposit) <= 0) label = 'Pay Back'
                else label = 'Deposit & Pay Back'
                break
            }
            case VaultAction.WITHDRAW_REPAY: {
                const { withdraw = '0', repay = '0' } = formState
                if (Number(withdraw) <= 0 && Number(repay) <= 0) {
                    return [false, 'Withdraw']
                }
                if (Number(repay) <= 0) label = 'Withdraw'
                else if (Number(withdraw) <= 0) label = 'Pay Back'
                else label = 'Withdraw & Pay Back'
                break
            }
            case VaultAction.WITHDRAW_BORROW: {
                const { withdraw = '0', borrow = '0' } = formState
                if (Number(withdraw) <= 0 && Number(borrow) <= 0) {
                    return [false, 'Withdraw']
                }
                if (Number(borrow) <= 0) label = 'Withdraw'
                else if (Number(withdraw) <= 0) label = 'Borrow'
                else label = 'Withdraw & Borrow'
                break
            }
            default:
                return [false, 'Deposit']
        }
        return [!error, label]
    }, [action, formState, error])

    const maxRepay = Number(debt.balance.raw) < Number(debt.total.current?.raw || 0) ? debt.balance : debt.total.current

    return (
        <>
            {reviewActive && (
                <VaultTxModal
                    onClose={() => {
                        setReviewActive(false)
                        vaultActions.setTransactionState(ActionState.NONE)
                    }}
                />
            )}
            <Container>
                <Header>
                    <Flex $width="100%" $justify="space-between" $align="center">
                        <Text $fontWeight={700}>Manage KITE Staking</Text>
                        {Object.values(formState).some((value) => Number(value || '0') > 0) && (
                            <Text
                                $color="rgba(0,0,0,0.5)"
                                $fontSize="0.8em"
                                $textDecoration="underline"
                                onClick={() => updateForm('clear')}
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
                            setStakingAmount(availableKite.toString())
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
                    <NumberInput
                        label={
                            <CenteredFlex $gap={8}>
                                <CheckBox checked={!isWithdraw} size={14} />
                                <Text>Stake</Text>
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
                            setUnstakingAmount(stakedKite.toString())
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
                    {pendingUnstakes.map((unstake) =>
                        unstake.availableIn === 'now' ? (
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    width: '100%',
                                }}
                            >
                                <Text $fontSize="0.85em">{`${unstake.amount} KITE available`}</Text>
                                <HaiButton  $variant="yellowish">
                                    Claim
                                </HaiButton>
                            </div>
                        ) : (
                            <Text $fontSize="0.85em">
                                {`${unstake.amount} KITE available to claim in ${unstake.availableIn}`}
                            </Text>
                        )
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
