/**
 * MinterMultiStepModal - MintExecute Step
 *
 * Handles the minting execution steps.
 * Generalized from HaiVeloTxModal/Execute to support any minter protocol.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BigNumber, ethers } from 'ethers'
import { useAccount } from 'wagmi'

import { ActionState, formatNumberWithStyle } from '~/utils'
import { useContract } from '~/hooks/useContract'
import { useMinterProtocol } from '~/providers/MinterProtocolProvider'
import { useVault } from '~/providers/VaultProvider'
import type { MinterProtocolConfig } from '~/types/minterProtocol'

import HAI_VELO_V2_ABI from '~/abis/haiVELO_v2.json'

import styled from 'styled-components'
import { Flex, HaiButton, Text } from '~/styles'
import { ModalBody, ModalFooter } from '../index'
import { ArrowRightCircle, Check } from 'react-feather'
import { Loader } from '~/components/Loader'
import { TransactionSummary } from '~/components/TransactionSummary'

export type MintExecutionPlan = {
    depositBaseWei?: string
    depositVeNftTokenIds?: string[]
    depositVeNftTotalWei?: string
    migrateV1Wei?: string
}

type Step = {
    key: 'depositBase' | 'depositVeNfts' | 'migrateV1'
    label: string
    run: () => Promise<void>
}

type Props = {
    config: MinterProtocolConfig
    plan: MintExecutionPlan
    includeBridge?: boolean
    onDone: (totalMintedWei?: string) => void
    onStepDone: (step: Step['key']) => void
}

export function MintExecute({ config, plan, includeBridge = false, onDone, onStepDone }: Props) {
    const { address } = useAccount()
    const { accountData, refetchAccount } = useMinterProtocol()

    const CONTRACT_ADDRESS = config.tokens.wrappedTokenV2Address
    const contract = useContract(CONTRACT_ADDRESS, HAI_VELO_V2_ABI as unknown as ethers.ContractInterface)
    const { refreshVault } = useVault()

    const [currentIndex, setCurrentIndex] = useState(0)
    const [pending, setPending] = useState(false)
    const [done, setDone] = useState<Record<string, boolean>>({})
    const [isComplete, setIsComplete] = useState(false)
    const hasClosedRef = useRef(false)

    // Take a snapshot of initial balances for stable "before" values in the summary
    const [initialBalances] = useState({
        base: accountData.baseTokenBalance.formatted,
        veNft: accountData.veNft.totalFormatted,
        v1: accountData.v1Balance,
    })

    useEffect(() => {
        return () => {
            hasClosedRef.current = true
        }
    }, [])

    const steps: Step[] = useMemo(() => {
        const list: Step[] = []
        if (plan.depositBaseWei && BigNumber.from(plan.depositBaseWei).gt(0)) {
            list.push({
                key: 'depositBase',
                label: `Convert ${config.tokens.baseTokenSymbol} (${formatNumberWithStyle(
                    ethers.utils.formatUnits(plan.depositBaseWei, 18),
                    { maxDecimals: 2 }
                )})`,
                run: async () => {
                    if (!contract || !address) return
                    const gas = await (contract as ethers.Contract).estimateGas.deposit(address, plan.depositBaseWei)
                    const tx = await (contract as ethers.Contract).deposit(address, plan.depositBaseWei, {
                        gasLimit: gas.mul(12).div(10),
                    })
                    await tx.wait()
                },
            })
        }
        if (plan.depositVeNftTokenIds && plan.depositVeNftTokenIds.length > 0) {
            list.push({
                key: 'depositVeNfts',
                label: `Convert ${plan.depositVeNftTokenIds.length} ve${config.tokens.baseTokenSymbol} NFT(s)`,
                run: async () => {
                    if (!contract || !address) return
                    const tokenIds = plan.depositVeNftTokenIds!.map((id) => BigNumber.from(id))
                    const gas = await (contract as ethers.Contract).estimateGas.depositNFTs(address, tokenIds)
                    const tx = await (contract as ethers.Contract).depositNFTs(address, tokenIds, {
                        gasLimit: gas.mul(12).div(10),
                    })
                    await tx.wait()
                },
            })
        }
        if (plan.migrateV1Wei && BigNumber.from(plan.migrateV1Wei).gt(0)) {
            list.push({
                key: 'migrateV1',
                label: `Migrate ${config.tokens.wrappedTokenV1Symbol || 'v1'} (${formatNumberWithStyle(
                    ethers.utils.formatUnits(plan.migrateV1Wei, 18),
                    { maxDecimals: 2 }
                )})`,
                run: async () => {
                    if (!contract || !address) return
                    const gas = await (contract as ethers.Contract).estimateGas.migrateV1toV2(
                        address,
                        plan.migrateV1Wei
                    )
                    const tx = await (contract as ethers.Contract).migrateV1toV2(address, plan.migrateV1Wei, {
                        gasLimit: gas.mul(12).div(10),
                    })
                    await tx.wait()
                },
            })
        }
        return list
    }, [plan, contract, address, config])

    // Calculate total amount that will be minted
    const totalMintedWei = useMemo(() => {
        let total = BigNumber.from(0)
        if (plan.depositBaseWei) total = total.add(BigNumber.from(plan.depositBaseWei))
        if (plan.depositVeNftTotalWei) total = total.add(BigNumber.from(plan.depositVeNftTotalWei))
        if (plan.migrateV1Wei) total = total.add(BigNumber.from(plan.migrateV1Wei))
        return total.toString()
    }, [plan])

    const handleRun = useCallback(async () => {
        const step = steps[currentIndex]
        if (!step) return
        setPending(true)
        try {
            await step.run()
            if (hasClosedRef.current) return

            setDone((d) => ({ ...d, [step.key]: true }))
            // Refresh minter provider balances
            await refetchAccount()
            // Also refresh VaultProvider collateral balances
            await refreshVault()
            if (hasClosedRef.current) return

            onStepDone(step.key)
            if (hasClosedRef.current) return

            if (currentIndex < steps.length - 1) {
                setCurrentIndex((i) => i + 1)
            } else {
                setIsComplete(true)
            }
        } catch (e) {
            console.error('Failed execution step', e)
        } finally {
            if (!hasClosedRef.current) {
                setPending(false)
            }
        }
    }, [steps, currentIndex, refetchAccount, onStepDone, refreshVault])

    const buttonLabel = useMemo(() => {
        if (isComplete) {
            return includeBridge ? 'Continue to Bridge' : 'Done'
        }
        const step = steps[currentIndex]
        if (!step) return includeBridge ? 'Continue to Bridge' : 'Done'
        switch (step.key) {
            case 'depositBase':
                return `Convert ${config.tokens.baseTokenSymbol}`
            case 'depositVeNfts':
                return `Convert ve${config.tokens.baseTokenSymbol} NFTs`
            case 'migrateV1':
                return `Migrate ${config.tokens.wrappedTokenV1Symbol || 'v1'}`
        }
    }, [steps, currentIndex, isComplete, includeBridge, config])

    // Format helper: parse 18-decimal wei to readable with 2 decimals
    const fmt18 = (wei?: string) =>
        wei && BigNumber.from(wei).gt(0)
            ? formatNumberWithStyle(ethers.utils.formatUnits(wei, 18), { maxDecimals: 2 })
            : undefined

    return (
        <>
            <ModalBody>
                <Flex $width="100%" $column $gap={12} $align="flex-start" $justify="flex-start">
                    <Description>
                        Convert {config.tokens.baseTokenSymbol}
                        {config.features.supportsVeNftDeposit ? `, ve${config.tokens.baseTokenSymbol} NFTs` : ''}
                        {config.features.supportsV1Migration && config.tokens.wrappedTokenV1Symbol
                            ? `, and migrate ${config.tokens.wrappedTokenV1Symbol}`
                            : ''}{' '}
                        to {config.displayName}.{includeBridge && ' Then bridge to Optimism.'}
                    </Description>
                    <TransactionSummary
                        items={(() => {
                            const items: {
                                label: string
                                value: { current?: string; after: string }
                                icon?: JSX.Element
                                isDone?: boolean
                            }[] = []
                            const base = BigNumber.from(plan.depositBaseWei || 0)
                            const veNft = BigNumber.from(plan.depositVeNftTotalWei || 0)
                            const v1 = BigNumber.from(plan.migrateV1Wei || 0)
                            const stepIcon = (key: Step['key']): JSX.Element | undefined => {
                                const idx = steps.findIndex((s) => s.key === key)
                                if (idx === -1) return undefined
                                if (done[key]) return <Check width={16} className={ActionState.SUCCESS} />
                                if (idx === currentIndex && pending) return <Loader size={16} color="#ff9d0a" />
                                return <ArrowRightCircle width={16} className={'stateless'} />
                            }

                            if (base.gt(0)) {
                                const initial = parseFloat(initialBalances.base || '0')
                                const diff = parseFloat(ethers.utils.formatUnits(plan.depositBaseWei!, 18))
                                const after = Math.max(0, initial - diff)
                                items.push({
                                    label: config.tokens.baseTokenSymbol,
                                    value: {
                                        current: formatNumberWithStyle(initial, { maxDecimals: 2 }),
                                        after: formatNumberWithStyle(after, { maxDecimals: 2 }),
                                    },
                                    icon: stepIcon('depositBase'),
                                    isDone: !!done['depositBase'],
                                })
                            }

                            if ((plan.depositVeNftTokenIds?.length || 0) > 0) {
                                const initial = parseFloat(initialBalances.veNft || '0')
                                const diff = parseFloat(ethers.utils.formatUnits(plan.depositVeNftTotalWei || '0', 18))
                                const after = Math.max(0, initial - diff)
                                items.push({
                                    label: `ve${config.tokens.baseTokenSymbol}`,
                                    value: {
                                        current: formatNumberWithStyle(initial, { maxDecimals: 2 }),
                                        after: formatNumberWithStyle(after, { maxDecimals: 2 }),
                                    },
                                    icon: stepIcon('depositVeNfts'),
                                    isDone: !!done['depositVeNfts'],
                                })
                            }

                            if (v1.gt(0) && config.tokens.wrappedTokenV1Symbol) {
                                const initial = parseFloat(initialBalances.v1 || '0')
                                const diff = parseFloat(ethers.utils.formatUnits(plan.migrateV1Wei!, 18))
                                const after = Math.max(0, initial - diff)
                                items.push({
                                    label: config.tokens.wrappedTokenV1Symbol,
                                    value: {
                                        current: formatNumberWithStyle(initial, { maxDecimals: 2 }),
                                        after: formatNumberWithStyle(after, { maxDecimals: 2 }),
                                    },
                                    icon: stepIcon('migrateV1'),
                                    isDone: !!done['migrateV1'],
                                })
                            }

                            // Total minted tokens row
                            if (isComplete) {
                                items.push({
                                    label: `Total ${config.displayName}`,
                                    value: {
                                        after: accountData.v2Balance.formatted,
                                    },
                                })
                            } else {
                                const remainingBase = done['depositBase'] ? BigNumber.from(0) : base
                                const remainingVeNft = done['depositVeNfts'] ? BigNumber.from(0) : veNft
                                const remainingV1 = done['migrateV1'] ? BigNumber.from(0) : v1
                                const totalFromRemainingPlan = remainingBase.add(remainingVeNft).add(remainingV1)
                                const afterTotal = BigNumber.from(accountData.v2Balance.raw || '0').add(
                                    totalFromRemainingPlan
                                )

                                items.push({
                                    label: `Total ${config.displayName}`,
                                    value: {
                                        current: accountData.v2Balance.formatted,
                                        after: fmt18(afterTotal.toString()) || '0',
                                    },
                                })
                            }
                            return items
                        })()}
                    />
                </Flex>
            </ModalBody>
            <ModalFooter $gap={24} $justify="flex-end">
                <HaiButton
                    $variant="yellowish"
                    disabled={pending}
                    onClick={isComplete ? () => onDone(totalMintedWei) : handleRun}
                >
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
