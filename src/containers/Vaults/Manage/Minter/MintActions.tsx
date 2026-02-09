/**
 * MintActions
 *
 * Actions component for minter protocols (haiVELO, haiAERO).
 * Handles token conversion to the wrapped token.
 * Generalized from MintHaiVeloActions.
 */

import { useEffect, useMemo, useState } from 'react'
import { useAccount, useNetwork, useSwitchNetwork } from 'wagmi'
import { ethers } from 'ethers'
import { AlertCircle } from 'react-feather'

import { formatNumberWithStyle, sanitizeDecimals, Status } from '~/utils'
import { useMinterProtocol } from '~/providers/MinterProtocolProvider'
import { MinterChainId } from '~/types/minterProtocol'
import { useStoreActions, useStoreState } from '~/store'
import { useTokenAllowance } from '~/hooks/useTokenApproval'
import { useContract } from '~/hooks/useContract'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { getTokenLabel } from '~/services/minterProtocol'
import { HaiVeloTxModal } from '~/components/Modal/HaiVeloTxModal'
import type { HaiVeloApprovalItem } from '~/components/Modal/HaiVeloTxModal/Approvals'
import { HaiAeroTxModal } from '~/components/Modal/HaiAeroTxModal'

import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { StatusLabel } from '~/components/StatusLabel'
import { NumberInput } from '~/components/NumberInput'
import { SelectInput, type SelectOption } from '~/components/SelectInput'
import { MultiSelectInput, type MultiSelectOption } from '~/components/MultiSelectInput'

export function MintActions() {
    const {
        config,
        mintingState,
        setSelectedToken,
        setConvertAmountBase,
        setConvertAmountV1,
        setSelectedVeNftTokenIds,
        accountData,
    } = useMinterProtocol()

    const { selectedToken, convertAmountBase, convertAmountV1, selectedVeNftTokenIds } = mintingState

    const { tokensData } = useStoreState((state) => state.connectWalletModel)
    const { prices } = useVelodromePrices()
    const { toggleModal } = useStoreActions((actions) => actions.popupsModel)
    const { address, isConnected } = useAccount()
    const { chain } = useNetwork()
    const { switchNetwork } = useSwitchNetwork()

    // Check if user is on the correct chain for this protocol
    const isOnCorrectChain = useMemo(() => {
        if (!chain) return false
        return chain.id === config.chainId
    }, [chain, config.chainId])

    // Check if this is haiAERO (Base chain) - automatically bridges to Optimism
    const isHaiAero = config.chainId === MinterChainId.BASE

    // Get chain name for display
    const requiredChainName = useMemo(() => {
        switch (config.chainId) {
            case MinterChainId.BASE:
                return 'Base'
            case MinterChainId.OPTIMISM:
                return 'Optimism'
            default:
                return 'the correct network'
        }
    }, [config.chainId])

    // Target contract for approvals
    const targetAddress = config.tokens.wrappedTokenV2Address

    // Token options for the select dropdown
    const tokenOptions = useMemo(() => {
        const options: SelectOption<'BASE' | 'VE_NFT' | 'V1'>[] = [
            { label: config.tokens.baseTokenSymbol, value: 'BASE' },
        ]

        if (config.features.supportsVeNftDeposit) {
            options.push({ label: `ve${config.tokens.baseTokenSymbol}`, value: 'VE_NFT' })
        }

        if (config.features.supportsV1Migration && config.tokens.wrappedTokenV1Symbol) {
            options.push({ label: config.tokens.wrappedTokenV1Symbol, value: 'V1' })
        }

        return options
    }, [config])

    // Calculate total received across all token types (1:1 conversion)
    const { totalReceivedRaw, totalReceivedDisplay } = useMemo(() => {
        const sanitize = (v: string) => (v ? Number(String(v).replace(/,/g, '')) : 0)
        const baseAmt = sanitize(convertAmountBase)
        const v1Amt = sanitize(convertAmountV1)

        const selectedNFTs = accountData.veNft.nfts.filter((nft) => selectedVeNftTokenIds.includes(nft.tokenId))
        const veNftAmt = selectedNFTs.reduce((sum, nft) => sum + parseFloat(nft.balanceFormatted), 0)

        const total = baseAmt + v1Amt + veNftAmt
        const display = total ? formatNumberWithStyle(total, { maxDecimals: 2 }) : '0'

        return { totalReceivedRaw: total, totalReceivedDisplay: display }
    }, [convertAmountBase, convertAmountV1, selectedVeNftTokenIds, accountData.veNft.nfts])

    // Create veNFT options for multi-select
    const veNftOptions: MultiSelectOption<string>[] = useMemo(() => {
        return accountData.veNft.nfts.map((nft) => ({
            label: `Lock #${nft.tokenId}`,
            value: nft.tokenId,
            description: `${formatNumberWithStyle(parseFloat(nft.balanceFormatted), {
                maxDecimals: 2,
            })} ve${config.tokens.baseTokenSymbol}`,
        }))
    }, [accountData.veNft.nfts, config.tokens.baseTokenSymbol])

    // Get available balance for selected token
    const getAvailableBalanceRaw = (token: 'BASE' | 'VE_NFT' | 'V1'): string => {
        switch (token) {
            case 'BASE':
                return accountData.baseTokenBalance.formatted || '0'
            case 'VE_NFT': {
                const selectedNFTs = accountData.veNft.nfts.filter((nft) => selectedVeNftTokenIds.includes(nft.tokenId))
                const totalBalance = selectedNFTs.reduce((sum, nft) => sum + parseFloat(nft.balanceFormatted), 0)
                return String(totalBalance)
            }
            case 'V1':
                return accountData.v1Balance || '0'
            default:
                return '0'
        }
    }

    const getAvailableBalanceDisplay = (token: 'BASE' | 'VE_NFT' | 'V1'): string => {
        const raw = Number((getAvailableBalanceRaw(token) || '0').toString())
        return formatNumberWithStyle(raw, { maxDecimals: 2 })
    }

    // Button active if there is any amount selected
    const buttonActive = useMemo(() => totalReceivedRaw > 0, [totalReceivedRaw])

    // Prefetch allowances
    const baseTokenAddress = tokensData[config.tokens.baseTokenSymbol]?.address
    const v1TokenAddress = config.tokens.wrappedTokenV1Symbol
        ? tokensData[config.tokens.wrappedTokenV1Symbol]?.address
        : undefined

    const { allowance: baseTokenAllowance } = useTokenAllowance(baseTokenAddress, address ?? undefined, targetAddress)
    const { allowance: v1TokenAllowance } = useTokenAllowance(v1TokenAddress, address ?? undefined, targetAddress)

    // Prefetch veNFT approvals
    // Note: These approval checks need to use the user's signer on the source chain
    // (Base for haiAERO, Optimism for haiVELO), so we DON'T use readOnly mode here.
    // The veNFT contract address comes from config which is chain-specific.
    const veNftABI = useMemo(
        () => [
            'function getApproved(uint256 tokenId) view returns (address)',
            'function isApprovedForAll(address owner, address operator) view returns (bool)',
        ],
        []
    )
    const veNftContract = useContract(config.tokens.veNftAddress, veNftABI, false)

    const [veNftApprovedMap, setVeNftApprovedMap] = useState<Record<string, boolean>>({})
    const [isApprovedForAll, setIsApprovedForAll] = useState(false)

    useEffect(() => {
        let mounted = true
        const fetchApprovals = async () => {
            // Skip approval fetching if not on the correct chain to avoid cross-chain errors
            // This is important during network transitions (e.g., switching to Base for haiAERO)
            if (!isOnCorrectChain || !veNftContract || !address || selectedVeNftTokenIds.length === 0) {
                if (mounted) {
                    if (Object.keys(veNftApprovedMap).length > 0) setVeNftApprovedMap({})
                    if (isApprovedForAll) setIsApprovedForAll(false)
                }
                return
            }

            try {
                const allApproved = await veNftContract.isApprovedForAll(address, targetAddress)
                if (!mounted) return
                if (allApproved !== isApprovedForAll) setIsApprovedForAll(allApproved)

                if (allApproved) {
                    if (Object.keys(veNftApprovedMap).length > 0) setVeNftApprovedMap({})
                    return
                }

                if (selectedVeNftTokenIds.length === 1) {
                    const tokenId = selectedVeNftTokenIds[0]
                    try {
                        const approvedFor: string = await veNftContract.getApproved(tokenId)
                        const ok = approvedFor?.toLowerCase() === targetAddress.toLowerCase()
                        if (mounted && veNftApprovedMap[tokenId] !== ok) {
                            setVeNftApprovedMap({ [tokenId]: ok })
                        }
                    } catch {
                        if (mounted && veNftApprovedMap[tokenId] !== false) {
                            setVeNftApprovedMap({ [tokenId]: false })
                        }
                    }
                } else {
                    if (mounted && Object.keys(veNftApprovedMap).length > 0) setVeNftApprovedMap({})
                }
            } catch (e) {
                // Log as debug instead of error since this can happen during network transitions
                console.debug('Error fetching veNFT approvals (may be during network transition):', e)
                if (mounted) {
                    if (Object.keys(veNftApprovedMap).length > 0) setVeNftApprovedMap({})
                    if (isApprovedForAll) setIsApprovedForAll(false)
                }
            }
        }
        fetchApprovals()
        return () => {
            mounted = false
        }
    }, [
        veNftContract,
        selectedVeNftTokenIds,
        address,
        targetAddress,
        isApprovedForAll,
        veNftApprovedMap,
        isOnCorrectChain,
    ])

    // Build required approvals list
    const requiredApprovals = useMemo<HaiVeloApprovalItem[]>(() => {
        const items: HaiVeloApprovalItem[] = []

        const pushErc20IfNeeded = (
            label: string,
            symbol: string,
            amountStr: string,
            allowance: ethers.BigNumber | undefined
        ) => {
            const tokenMeta = tokensData[symbol]
            const addr = tokenMeta?.address
            const decimals = (tokenMeta?.decimals || 18).toString()
            // Sanitize the amount string (remove commas and other non-numeric chars except decimal point)
            const cleanAmount = String(amountStr || '0').replace(/[^0-9.]/g, '')
            const amountNum = parseFloat(cleanAmount)
            if (!addr || !isFinite(amountNum) || amountNum <= 0) return

            // Calculate the exact wei amount that will be used for execution
            // This ensures the approval amount matches the execution amount exactly
            const neededWei = ethers.utils.parseUnits(sanitizeDecimals(cleanAmount, Number(decimals)), Number(decimals))

            // If allowance is undefined (still loading), assume we need approval
            // This prevents the race condition where the modal opens without the needed approval
            const needsApproval = !allowance || allowance.lt(neededWei)

            if (needsApproval) {
                items.push({
                    kind: 'ERC20',
                    label,
                    // Pass the cleaned amount to ensure consistent parsing in useTokenApproval
                    amount: cleanAmount,
                    tokenAddress: addr,
                    decimals,
                    spender: targetAddress,
                })
            }
        }

        pushErc20IfNeeded(
            config.tokens.baseTokenSymbol,
            config.tokens.baseTokenSymbol,
            convertAmountBase,
            baseTokenAllowance
        )

        if (config.tokens.wrappedTokenV1Symbol) {
            pushErc20IfNeeded(
                config.tokens.wrappedTokenV1Symbol,
                config.tokens.wrappedTokenV1Symbol,
                convertAmountV1,
                v1TokenAllowance
            )
        }

        // veNFT approvals
        if (selectedVeNftTokenIds.length > 1) {
            if (!isApprovedForAll) {
                items.push({
                    kind: 'ERC721_COLLECTION',
                    label: `ve${config.tokens.baseTokenSymbol} Collection`,
                    nftAddress: config.tokens.veNftAddress,
                    spender: targetAddress,
                })
            }
        } else if (selectedVeNftTokenIds.length === 1) {
            const tokenId = selectedVeNftTokenIds[0]
            if (!isApprovedForAll && !veNftApprovedMap[tokenId]) {
                items.push({
                    kind: 'ERC721_TOKEN',
                    label: `ve${config.tokens.baseTokenSymbol} #${tokenId}`,
                    nftAddress: config.tokens.veNftAddress,
                    tokenId,
                    spender: targetAddress,
                })
            }
        }

        return items
    }, [
        tokensData,
        convertAmountBase,
        convertAmountV1,
        selectedVeNftTokenIds,
        baseTokenAllowance,
        v1TokenAllowance,
        isApprovedForAll,
        veNftApprovedMap,
        targetAddress,
        config,
    ])

    const [approvalsOpen, setApprovalsOpen] = useState(false)
    const [executionPlan, setExecutionPlan] = useState<{
        depositVeloWei?: string
        depositVeNftTokenIds?: string[]
        depositVeNftTotalWei?: string
        migrateV1Wei?: string
    } | null>(null)

    const handleStepDone = (step: 'depositVelo' | 'depositVeNfts' | 'migrateV1') => {
        switch (step) {
            case 'depositVelo':
                setConvertAmountBase('')
                break
            case 'depositVeNfts':
                setSelectedVeNftTokenIds([])
                break
            case 'migrateV1':
                setConvertAmountV1('')
                break
        }
    }

    // Get base token price
    const baseTokenPrice = useMemo(() => {
        const priceData = prices?.[config.tokens.baseTokenSymbol]
        return priceData?.raw ? Number(priceData.raw) : 0
    }, [prices, config.tokens.baseTokenSymbol])

    return (
        <Container>
            <Header>
                <Flex $width="100%" $justify="space-between" $align="center">
                    <Text $fontWeight={700}>Mint {config.displayName}</Text>
                    <Flex $gap={12} $align="center">
                        {accountData.isLoading && (
                            <Text $color="rgba(0,0,0,0.5)" $fontSize="0.8em">
                                Loading...
                            </Text>
                        )}
                        {accountData.isError && (
                            <Text $color="red" $fontSize="0.8em">
                                Error loading balances
                            </Text>
                        )}
                        {((selectedToken === 'BASE' && Number((convertAmountBase || '0').replace(/,/g, '')) > 0) ||
                            (selectedToken === 'V1' && Number((convertAmountV1 || '0').replace(/,/g, '')) > 0)) && (
                            <Text
                                $color="rgba(0,0,0,0.5)"
                                $fontSize="0.8em"
                                $textDecoration="underline"
                                onClick={() => {
                                    if (selectedToken === 'BASE') setConvertAmountBase('')
                                    if (selectedToken === 'V1') setConvertAmountV1('')
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                Clear
                            </Text>
                        )}
                        {selectedToken === 'VE_NFT' && selectedVeNftTokenIds.length > 0 && (
                            <Text
                                $color="rgba(0,0,0,0.5)"
                                $fontSize="0.8em"
                                $textDecoration="underline"
                                onClick={() => setSelectedVeNftTokenIds([])}
                                style={{ cursor: 'pointer' }}
                            >
                                Clear NFTs
                            </Text>
                        )}
                    </Flex>
                </Flex>
            </Header>
            <Body>
                {/* Network Check - Show warning if user is on wrong chain */}
                {isConnected && !isOnCorrectChain && (
                    <NetworkWarning status={Status.CUSTOM} background="gradientCooler">
                        <Flex $align="center" $gap={8}>
                            <AlertCircle size={18} />
                            <Text $fontSize="0.85em">
                                Please switch to {requiredChainName} network to mint {config.displayName}
                            </Text>
                        </Flex>
                        <HaiButton
                            $variant="yellowish"
                            $padding="8px 16px"
                            onClick={() => switchNetwork?.(config.chainId)}
                        >
                            Switch to {requiredChainName}
                        </HaiButton>
                    </NetworkWarning>
                )}

                {/* Token Selection Dropdown */}
                <SelectInput
                    label="Select Token to Convert"
                    subLabel="Choose token type"
                    options={tokenOptions}
                    value={selectedToken}
                    onChange={setSelectedToken}
                />

                {/* Convert Amount Input */}
                {selectedToken === 'VE_NFT' ? (
                    <MultiSelectInput
                        label={`Select ve${config.tokens.baseTokenSymbol} NFTs`}
                        subLabel={`Available: ${formatNumberWithStyle(parseFloat(accountData.veNft.totalFormatted), {
                            maxDecimals: 2,
                        })} ve${config.tokens.baseTokenSymbol}`}
                        options={veNftOptions}
                        selectedValues={selectedVeNftTokenIds}
                        onChange={setSelectedVeNftTokenIds}
                        placeholder="Select NFTs to convert"
                    />
                ) : (
                    <NumberInput
                        label="Convert"
                        subLabel={`Available: ${getAvailableBalanceDisplay(selectedToken)} ${getTokenLabel(
                            config,
                            selectedToken
                        )}`}
                        placeholder="Amount to Convert"
                        unitLabel={getTokenLabel(config, selectedToken)}
                        min="0"
                        max={getAvailableBalanceRaw(selectedToken)}
                        onChange={(value: string) => {
                            const maxStr = getAvailableBalanceRaw(selectedToken)
                            const maxNum = Number((maxStr || '0').toString())
                            const nextValue =
                                value === ''
                                    ? ''
                                    : (() => {
                                          const n = Number(value)
                                          if (!isFinite(n)) return ''
                                          return n > maxNum ? maxStr : value
                                      })()
                            if (selectedToken === 'BASE') setConvertAmountBase(nextValue || '')
                            if (selectedToken === 'V1') setConvertAmountV1(nextValue || '')
                        }}
                        value={selectedToken === 'BASE' ? convertAmountBase : convertAmountV1}
                        onMax={() => {
                            if (selectedToken === 'BASE') {
                                setConvertAmountBase(getAvailableBalanceRaw(selectedToken))
                            }
                            if (selectedToken === 'V1') {
                                setConvertAmountV1(getAvailableBalanceRaw(selectedToken))
                            }
                        }}
                        conversion={(() => {
                            const rawAmt =
                                selectedToken === 'BASE'
                                    ? Number((convertAmountBase || '0').replace(/,/g, ''))
                                    : Number((convertAmountV1 || '0').replace(/,/g, ''))
                            if (rawAmt <= 0) return ''
                            const usd = rawAmt * (isFinite(baseTokenPrice) ? baseTokenPrice : 0)
                            return `~${formatNumberWithStyle(usd, { style: 'currency' })}`
                        })()}
                    />
                )}

                {/* Received Output (Disabled) */}
                <NumberInput
                    label={`${config.displayName} Received`}
                    subLabel="1:1 Conversion Rate"
                    placeholder="0"
                    unitLabel={config.displayName}
                    onChange={() => {}}
                    value={totalReceivedDisplay}
                    disabled={true}
                    conversion={(() => {
                        const usd = totalReceivedRaw * (isFinite(baseTokenPrice) ? baseTokenPrice : 0)
                        return totalReceivedRaw > 0 ? `~${formatNumberWithStyle(usd, { style: 'currency' })}` : ''
                    })()}
                />

                {/* Selected for Conversion Summary */}
                <Flex $column $gap={8} $width="100%">
                    <Text $fontWeight={700}>Selected for Conversion</Text>
                    {(() => {
                        const baseAmt = Number((convertAmountBase || '0').replace(/,/g, ''))
                        const v1Amt = Number((convertAmountV1 || '0').replace(/,/g, ''))
                        const selected = accountData.veNft.nfts.filter((n) => selectedVeNftTokenIds.includes(n.tokenId))
                        const hasAny = baseAmt > 0 || v1Amt > 0 || selected.length > 0
                        if (!hasAny) {
                            return (
                                <Text $color="rgba(0,0,0,0.5)" $fontSize="0.9em">
                                    Nothing selected yet. Choose tokens to convert.
                                </Text>
                            )
                        }
                        return (
                            <Flex $column $gap={8}>
                                {baseAmt > 0 && (
                                    <Flex $justify="space-between" $align="center">
                                        <Text>
                                            {config.tokens.baseTokenSymbol}:{' '}
                                            <strong>{formatNumberWithStyle(baseAmt, { maxDecimals: 2 })}</strong>
                                        </Text>
                                        <Text
                                            $textDecoration="underline"
                                            $color="rgba(0,0,0,0.6)"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setConvertAmountBase('')}
                                        >
                                            Clear
                                        </Text>
                                    </Flex>
                                )}
                                {v1Amt > 0 && config.tokens.wrappedTokenV1Symbol && (
                                    <Flex $justify="space-between" $align="center">
                                        <Text>
                                            {config.tokens.wrappedTokenV1Symbol}:{' '}
                                            <strong>{formatNumberWithStyle(v1Amt, { maxDecimals: 2 })}</strong>
                                        </Text>
                                        <Text
                                            $textDecoration="underline"
                                            $color="rgba(0,0,0,0.6)"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setConvertAmountV1('')}
                                        >
                                            Clear
                                        </Text>
                                    </Flex>
                                )}
                                {selected.length > 0 && (
                                    <Flex $column $gap={6}>
                                        {selected.map((n) => (
                                            <Flex key={n.tokenId} $justify="space-between" $align="center">
                                                <Text>
                                                    ve{config.tokens.baseTokenSymbol} #{n.tokenId}:{' '}
                                                    <strong>
                                                        {formatNumberWithStyle(parseFloat(n.balanceFormatted), {
                                                            maxDecimals: 2,
                                                        })}
                                                    </strong>
                                                </Text>
                                                <Text
                                                    $textDecoration="underline"
                                                    $color="rgba(0,0,0,0.6)"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() =>
                                                        setSelectedVeNftTokenIds(
                                                            selectedVeNftTokenIds.filter((id) => id !== n.tokenId)
                                                        )
                                                    }
                                                >
                                                    Clear
                                                </Text>
                                            </Flex>
                                        ))}
                                        {selected.length > 1 && (
                                            <Flex $justify="flex-end">
                                                <Text
                                                    $textDecoration="underline"
                                                    $color="rgba(0,0,0,0.6)"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => setSelectedVeNftTokenIds([])}
                                                >
                                                    Clear all NFTs
                                                </Text>
                                            </Flex>
                                        )}
                                    </Flex>
                                )}
                            </Flex>
                        )
                    })()}
                </Flex>

                {/* Conversion Warning */}
                <WarningLabel status={Status.CUSTOM} background="gradientCooler">
                    <Text $fontSize="0.8em">
                        {isHaiAero ? (
                            <>
                                ⚠ Converting AERO and veAERO NFTs is an irreversible action. You may deposit and
                                withdraw haiAERO, but not convert them back to AERO or veAERO. A secondary market
                                however exists on Aerodrome to allow the exchange of haiAERO for AERO at varying market
                                rates.
                            </>
                        ) : (
                            <>
                                ⚠️ {config.tokens.baseTokenSymbol}
                                {config.features.supportsV1Migration && config.tokens.wrappedTokenV1Symbol
                                    ? ` and ${config.tokens.wrappedTokenV1Symbol}`
                                    : ''}{' '}
                                converted here are permanently max locked into ve{config.tokens.baseTokenSymbol} with{' '}
                                {config.displayName} issued at a 1:1 ratio.
                            </>
                        )}
                    </Text>
                </WarningLabel>

                {/* Bridge info for haiAERO */}
                {isHaiAero && (
                    <BridgeInfo status={Status.CUSTOM} background="gradientCooler">
                        <Text $fontSize="0.8em">
                            🌉 After minting, your haiAERO will be automatically bridged to Optimism via Hyperlane so
                            you can use it as vault collateral.
                        </Text>
                    </BridgeInfo>
                )}
            </Body>
            <Footer>
                <HaiButton
                    $variant="yellowish"
                    $width="100%"
                    $justify="center"
                    disabled={!buttonActive || accountData.isLoading || !isOnCorrectChain}
                    onClick={() => {
                        setExecutionPlan({
                            depositVeloWei: convertAmountBase
                                ? ethers.utils.parseUnits((convertAmountBase || '0').replace(/,/g, ''), 18).toString()
                                : undefined,
                            depositVeNftTokenIds: selectedVeNftTokenIds.length > 0 ? selectedVeNftTokenIds : undefined,
                            depositVeNftTotalWei: (() => {
                                try {
                                    const selected = accountData.veNft.nfts.filter((n) =>
                                        selectedVeNftTokenIds.includes(n.tokenId)
                                    )
                                    const sum = selected.reduce(
                                        (acc, n) => acc.add(ethers.BigNumber.from(n.balance)),
                                        ethers.BigNumber.from(0)
                                    )
                                    return sum.gt(0) ? sum.toString() : undefined
                                } catch {
                                    return undefined
                                }
                            })(),
                            migrateV1Wei: convertAmountV1
                                ? ethers.utils.parseUnits((convertAmountV1 || '0').replace(/,/g, ''), 18).toString()
                                : undefined,
                        })
                        setApprovalsOpen(true)
                        toggleModal({ modal: 'reviewTx', isOpen: true })
                    }}
                >
                    {accountData.isLoading
                        ? 'Loading...'
                        : isHaiAero
                        ? `Mint & Bridge ${config.displayName}`
                        : `Convert to ${config.displayName}`}
                </HaiButton>
                {approvalsOpen && executionPlan && isHaiAero && (
                    <HaiAeroTxModal
                        config={config}
                        plan={{
                            depositBaseWei: executionPlan.depositVeloWei,
                            depositVeNftTokenIds: executionPlan.depositVeNftTokenIds,
                            depositVeNftTotalWei: executionPlan.depositVeNftTotalWei,
                        }}
                        onSuccess={() => {
                            // Clear the form after successful mint & bridge
                            setConvertAmountBase('')
                            setSelectedVeNftTokenIds([])
                        }}
                        onClose={() => {
                            setApprovalsOpen(false)
                            toggleModal({ modal: 'reviewTx', isOpen: false })
                        }}
                    />
                )}
                {approvalsOpen && executionPlan && !isHaiAero && (
                    <HaiVeloTxModal
                        items={requiredApprovals}
                        plan={executionPlan}
                        onAllApproved={() => {
                            setApprovalsOpen(false)
                            toggleModal({ modal: 'reviewTx', isOpen: false })
                        }}
                        onClose={() => {
                            setApprovalsOpen(false)
                            toggleModal({ modal: 'reviewTx', isOpen: false })
                        }}
                        onStepDone={handleStepDone}
                    />
                )}
            </Footer>
        </Container>
    )
}

// ============================================================================
// Styled Components
// ============================================================================

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

const Footer = styled(CenteredFlex).attrs((props) => ({
    $column: true,
    $gap: 12,
    ...props,
}))`
    width: 100%;
    padding: 24px;
    border-top: ${({ theme }) => theme.border.thin};
`

const WarningLabel = styled(StatusLabel)`
    border-radius: 12px;
`

const BridgeInfo = styled(StatusLabel)`
    border-radius: 12px;
`

const NetworkWarning = styled(StatusLabel)`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border-radius: 12px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
    `}
`

export default MintActions
