import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BigNumber, ethers } from 'ethers'
import { useAccount } from 'wagmi'

// import { useStoreActions } from '~/store'
import { ActionState, formatNumberWithStyle } from '~/utils'
import { useContract } from '~/hooks/useContract'

import HAI_VELO_V2_ABI from '~/abis/haiVELO_v2.json'

import styled from 'styled-components'
import { Flex, HaiButton, Text } from '~/styles'
import { ModalBody, ModalFooter } from '../index'
import { ArrowRightCircle, Check } from 'react-feather'
import { Loader } from '~/components/Loader'
import { TransactionSummary } from '~/components/TransactionSummary'
import { useMinterProtocol } from '~/providers/MinterProtocolProvider'
import { useVault } from '~/providers/VaultProvider'

type ExecutionPlan = {
    depositVeloWei?: string
    depositVeNftTokenIds?: string[]
    migrateV1Wei?: string
}

type Step = {
    key: 'depositVelo' | 'depositVeNfts' | 'migrateV1'
    label: string
    run: () => Promise<void>
}

type Props = {
    plan: ExecutionPlan
    onDone: () => void
    onStepDone: (step: Step['key']) => void
}

export function Execute({ plan, onDone, onStepDone }: Props) {
    const { address } = useAccount()
    // const { popupsModel: popupsActions } = useStoreActions((actions) => actions)
    const { accountData, refetchAccount, config } = useMinterProtocol()
    const { baseTokenBalance, veNft, v1Balance, v2Balance } = accountData

    // Map to legacy variable names for compatibility
    const baseTokenBalanceFormatted = baseTokenBalance.formatted || '0'
    const veNftBalanceFormatted = veNft.totalFormatted || '0'
    const v1BalanceFormatted = v1Balance || '0'
    const v2BalanceRaw = v2Balance.raw || '0'
    const v2BalanceFormatted = v2Balance.formatted || '0'

    const contract = useContract(config.tokens.wrappedTokenV2Address, HAI_VELO_V2_ABI as unknown[], true)
    const { refreshVault } = useVault()

    const [currentIndex, setCurrentIndex] = useState(0)
    const [pending, setPending] = useState(false)
    const [done, setDone] = useState<Record<string, boolean>>({})
    const [isComplete, setIsComplete] = useState(false)
    const hasClosedRef = useRef(false)

    // Take a snapshot of initial balances for stable "before" values in the summary
    const [initialBalances] = useState({
        baseToken: baseTokenBalanceFormatted,
        veNft: veNftBalanceFormatted,
        v1: v1BalanceFormatted,
    })

    useEffect(() => {
        return () => {
            hasClosedRef.current = true
        }
    }, [])

    const steps: Step[] = useMemo(() => {
        const list: Step[] = []
        const baseSymbol = config.tokens.baseTokenSymbol
        const v1Symbol = config.tokens.wrappedTokenV1Symbol || `${config.displayName} v1`

        if (plan.depositVeloWei && BigNumber.from(plan.depositVeloWei).gt(0)) {
            list.push({
                key: 'depositVelo',
                label: `Convert ${baseSymbol} (${formatNumberWithStyle(plan.depositVeloWei, { maxDecimals: 2 })})`,
                run: async () => {
                    if (!contract || !address) return
                    const gas = await (contract as any).estimateGas.deposit(address, plan.depositVeloWei)
                    const tx = await (contract as any).deposit(address, plan.depositVeloWei, {
                        gasLimit: gas.mul(12).div(10),
                    })
                    await tx.wait()
                },
            })
        }
        if (plan.depositVeNftTokenIds && plan.depositVeNftTokenIds.length > 0) {
            list.push({
                key: 'depositVeNfts',
                label: `Convert ${plan.depositVeNftTokenIds.length} ve${baseSymbol} NFT(s)`,
                run: async () => {
                    if (!contract || !address) return
                    const tokenIds = plan.depositVeNftTokenIds!.map((id) => BigNumber.from(id))
                    const gas = await (contract as any).estimateGas.depositNFTs(address, tokenIds)
                    const tx = await (contract as any).depositNFTs(address, tokenIds, {
                        gasLimit: gas.mul(12).div(10),
                    })
                    await tx.wait()
                },
            })
        }
        if (plan.migrateV1Wei && BigNumber.from(plan.migrateV1Wei).gt(0)) {
            list.push({
                key: 'migrateV1',
                label: `Migrate ${v1Symbol} (${formatNumberWithStyle(plan.migrateV1Wei, { maxDecimals: 2 })})`,
                run: async () => {
                    if (!contract || !address) return
                    const gas = await (contract as any).estimateGas.migrateV1toV2(address, plan.migrateV1Wei)
                    const tx = await (contract as any).migrateV1toV2(address, plan.migrateV1Wei, {
                        gasLimit: gas.mul(12).div(10),
                    })
                    await tx.wait()
                },
            })
        }
        return list
    }, [plan, contract, address, config])

    const handleRun = useCallback(async () => {
        const step = steps[currentIndex]
        if (!step) return
        setPending(true)
        // Keep UX within this modal: do not open the global waiting modal
        try {
            await step.run()
            if (hasClosedRef.current) return

            setDone((d) => ({ ...d, [step.key]: true }))
            // Refresh minter protocol balances (v2 etc.)
            await refetchAccount()
            // Also refresh VaultProvider collateral balances (and tokens) for the Create tab
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

    // Note: We advance steps explicitly after each confirmed tx in handleRun to avoid double-advancing

    const buttonLabel = useMemo(() => {
        if (isComplete) return 'Done'
        const step = steps[currentIndex]
        if (!step) return 'Done'
        const baseSymbol = config.tokens.baseTokenSymbol
        const v1Symbol = config.tokens.wrappedTokenV1Symbol || `${config.displayName} v1`
        switch (step.key) {
            case 'depositVelo':
                return `Convert ${baseSymbol}`
            case 'depositVeNfts':
                return `Convert ve${baseSymbol} NFTs`
            case 'migrateV1':
                return `Migrate ${v1Symbol}`
        }
    }, [steps, currentIndex, isComplete, config])

    // Format helper: parse 18-decimal wei to readable with 2 decimals
    const fmt18 = (wei?: string) =>
        wei && BigNumber.from(wei).gt(0)
            ? formatNumberWithStyle(ethers.utils.formatUnits(wei, 18), { maxDecimals: 2 })
            : undefined

    const baseSymbol = config.tokens.baseTokenSymbol
    const v1Symbol = config.tokens.wrappedTokenV1Symbol || `${config.displayName} v1`

    return (
        <>
            <ModalBody>
                <Flex $width="100%" $column $gap={12} $align="flex-start" $justify="flex-start">
                    <Description>
                        Convert {baseSymbol}, ve{baseSymbol} NFTs, and migrate {v1Symbol} to {config.displayName}.
                    </Description>
                    <TransactionSummary
                        items={(() => {
                            const items: {
                                label: string
                                value: { current?: string; after: string }
                                icon?: React.ReactNode
                                isDone?: boolean
                            }[] = []
                            const baseTokenWei = BigNumber.from(plan.depositVeloWei || 0)
                            const veNftWei = BigNumber.from((plan as any).depositVeNftTotalWei || 0)
                            const v1Wei = BigNumber.from(plan.migrateV1Wei || 0)
                            const stepIcon = (key: Step['key']) => {
                                const idx = steps.findIndex((s) => s.key === key)
                                if (idx === -1) return null
                                if (done[key]) return <Check width={16} className={ActionState.SUCCESS} />
                                if (idx === currentIndex && pending) return <Loader size={16} color="#ff9d0a" />
                                return <ArrowRightCircle width={16} className={'stateless'} />
                            }

                            if (baseTokenWei.gt(0)) {
                                const initial = parseFloat(initialBalances.baseToken || '0')
                                const diff = parseFloat(ethers.utils.formatUnits(plan.depositVeloWei!, 18))
                                const after = Math.max(0, initial - diff)
                                items.push({
                                    label: baseSymbol,
                                    value: {
                                        current: formatNumberWithStyle(initial, { maxDecimals: 2 }),
                                        after: formatNumberWithStyle(after, { maxDecimals: 2 }),
                                    },
                                    icon: stepIcon('depositVelo'),
                                    isDone: !!done['depositVelo'],
                                })
                            }

                            if ((plan.depositVeNftTokenIds?.length || 0) > 0) {
                                const initial = parseFloat(initialBalances.veNft || '0')
                                const diff = parseFloat(
                                    ethers.utils.formatUnits((plan as any).depositVeNftTotalWei || '0', 18)
                                )
                                const after = Math.max(0, initial - diff)
                                items.push({
                                    label: `ve${baseSymbol}`,
                                    value: {
                                        current: formatNumberWithStyle(initial, { maxDecimals: 2 }),
                                        after: formatNumberWithStyle(after, { maxDecimals: 2 }),
                                    },
                                    icon: stepIcon('depositVeNfts'),
                                    isDone: !!done['depositVeNfts'],
                                })
                            }

                            if (v1Wei.gt(0)) {
                                const initial = parseFloat(initialBalances.v1 || '0')
                                const diff = parseFloat(ethers.utils.formatUnits(plan.migrateV1Wei!, 18))
                                const after = Math.max(0, initial - diff)
                                items.push({
                                    label: v1Symbol,
                                    value: {
                                        current: formatNumberWithStyle(initial, { maxDecimals: 2 }),
                                        after: formatNumberWithStyle(after, { maxDecimals: 2 }),
                                    },
                                    icon: stepIcon('migrateV1'),
                                    isDone: !!done['migrateV1'],
                                })
                            }

                            // Special handling for the Total v2 row
                            if (isComplete) {
                                items.push({
                                    label: `Total ${config.displayName}`,
                                    value: {
                                        after: v2BalanceFormatted,
                                    },
                                })
                            } else {
                                const remainingBaseToken = done['depositVelo'] ? BigNumber.from(0) : baseTokenWei
                                const remainingVeNft = done['depositVeNfts'] ? BigNumber.from(0) : veNftWei
                                const remainingV1 = done['migrateV1'] ? BigNumber.from(0) : v1Wei
                                const totalFromRemainingPlan = remainingBaseToken.add(remainingVeNft).add(remainingV1)
                                const afterTotal = BigNumber.from(v2BalanceRaw || '0').add(totalFromRemainingPlan)

                                items.push({
                                    label: `Total ${config.displayName}`,
                                    value: {
                                        current: v2BalanceFormatted,
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
                <HaiButton $variant="yellowish" disabled={pending} onClick={isComplete ? onDone : handleRun}>
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

// const SectionTitle = styled(Text).attrs((p) => ({ $fontWeight: 700, ...p }))``

// const List = styled(CenteredFlex).attrs((p) => ({ $column: true, $gap: 12, ...p }))``
// const Row = styled(CenteredFlex)<{ $active: boolean }>`
//     width: 100%;
//     justify-content: flex-start;
//     padding: 8px 0;
//     opacity: ${({ $active }) => ($active ? 1 : 0.7)};
// `
