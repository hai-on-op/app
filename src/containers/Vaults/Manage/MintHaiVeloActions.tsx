import { useEffect, useMemo, useState } from 'react'

import { formatNumberWithStyle } from '~/utils'
import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { NumberInput } from '~/components/NumberInput'
import { SelectInput, type SelectOption } from '~/components/SelectInput'
import { MultiSelectInput, type MultiSelectOption } from '~/components/MultiSelectInput'
import { useHaiVelo } from '~/providers/HaiVeloProvider'
import { HaiVeloTxModal } from '~/components/Modal/HaiVeloTxModal'
import type { HaiVeloApprovalItem } from '~/components/Modal/HaiVeloTxModal/Approvals'
import { useStoreActions, useStoreState } from '~/store'
import { useTokenAllowance } from '~/hooks/useTokenApproval'
import { useContract } from '~/hooks/useContract'
import { ethers } from 'ethers'
import { useAccount } from 'wagmi'
import { sanitizeDecimals } from '~/utils'

export function MintHaiVeloActions() {
    const {
        selectedToken,
        setSelectedToken,
        convertAmountVelo,
        setConvertAmountVelo,
        convertAmountHaiVeloV1,
        setConvertAmountHaiVeloV1,
        selectedVeVeloNFTs,
        setSelectedVeVeloNFTs,
        data: {
            loading,
            error,
            veloBalanceFormatted,
            veVeloBalanceFormatted,
            veVeloNFTs,
            haiVeloV1BalanceFormatted,
            haiVeloV2Balance,
            haiVeloV2BalanceFormatted,
        },
    } = useHaiVelo()

    const { tokensData } = useStoreState((state) => state.connectWalletModel)
    const { toggleModal } = useStoreActions((actions) => actions.popupsModel)
    const { address } = useAccount()

    // Target contract for approvals (optimism mainnet)
    const HAI_VELO_V2_TARGET = '0xc00843e6e7574b2a633206f78fe95941c98652ab'

    // Token options for the select dropdown
    const tokenOptions: SelectOption<'VELO' | 'veVELO' | 'haiVELO_v1'>[] = [
        { label: 'VELO', value: 'VELO' },
        { label: 'veVELO', value: 'veVELO' },
        { label: 'haiVELO v1', value: 'haiVELO_v1' },
    ]

    // Handle token selection change (persist inputs across tokens)
    const handleTokenChange = (token: 'VELO' | 'veVELO' | 'haiVELO_v1') => {
        setSelectedToken(token)
    }

    // Calculate total haiVELO received across all token types (1:1 placeholder)
    const { haiVeloReceivedTotalRaw, haiVeloReceivedDisplay } = useMemo(() => {
        const sanitize = (v: string) => (v ? Number(String(v).replace(/,/g, '')) : 0)
        const veloAmt = sanitize(convertAmountVelo)
        const haiVeloV1Amt = sanitize(convertAmountHaiVeloV1)

        const selectedNFTs = veVeloNFTs.filter((nft) => selectedVeVeloNFTs.includes(nft.tokenId))
        const veVeloAmt = selectedNFTs.reduce((sum, nft) => sum + parseFloat(nft.balanceFormatted), 0)

        const total = veloAmt + haiVeloV1Amt + veVeloAmt
        const display = total
            ? formatNumberWithStyle(total, {
                  maxDecimals: 2,
              })
            : '0'
        return { haiVeloReceivedTotalRaw: total, haiVeloReceivedDisplay: display }
    }, [convertAmountVelo, convertAmountHaiVeloV1, selectedVeVeloNFTs, veVeloNFTs])

    // Get token label for display
    const getTokenLabel = (token: 'VELO' | 'veVELO' | 'haiVELO_v1'): string => {
        switch (token) {
            case 'VELO':
                return 'VELO'
            case 'veVELO':
                return 'veVELO'
            case 'haiVELO_v1':
                return 'haiVELO v1'
            default:
                return 'VELO'
        }
    }

    // Create veVELO NFT options for multi-select
    const veVeloNFTOptions: MultiSelectOption<string>[] = useMemo(() => {
        return veVeloNFTs.map(nft => ({
            label: `Lock #${nft.tokenId}`,
            value: nft.tokenId,
            description: `${formatNumberWithStyle(parseFloat(nft.balanceFormatted), {
                maxDecimals: 2,
            })} veVELO`,
        }))
    }, [veVeloNFTs])

    // Get available balance for selected token
    const getAvailableBalance = (token: 'VELO' | 'veVELO' | 'haiVELO_v1'): string => {
        switch (token) {
            case 'VELO':
                return formatNumberWithStyle(veloBalanceFormatted, {
                    maxDecimals: 2,
                })
            case 'veVELO':
                // Calculate total from selected NFTs
                const selectedNFTs = veVeloNFTs.filter(nft => selectedVeVeloNFTs.includes(nft.tokenId))
                const totalBalance = selectedNFTs.reduce((sum, nft) => sum + parseFloat(nft.balanceFormatted), 0)
                return formatNumberWithStyle(totalBalance, {
                    maxDecimals: 2,
                })
            case 'haiVELO_v1':
                return formatNumberWithStyle(haiVeloV1BalanceFormatted, { maxDecimals: 2 })
            default:
                return '0.00'
        }
    }

    // Button active if there is any amount selected across any token type
    const buttonActive = useMemo(() => {
        return haiVeloReceivedTotalRaw > 0
    }, [haiVeloReceivedTotalRaw])

    // Prefetch allowances
    const veloTokenAddress = tokensData['VELO']?.address
    const haiVeloV1TokenAddress = tokensData['HAIVELO']?.address
    const { allowance: veloAllowance } = useTokenAllowance(veloTokenAddress, address ?? undefined, HAI_VELO_V2_TARGET)
    const { allowance: haiVeloV1Allowance } = useTokenAllowance(
        haiVeloV1TokenAddress,
        address ?? undefined,
        HAI_VELO_V2_TARGET
    )

    // Prefetch veNFT single-token approvals
    const VE_NFT_ADDRESS = '0xFAf8FD17D9840595845582fCB047DF13f006787d'
    const veNftContract = useContract(
        selectedVeVeloNFTs.length > 0 ? VE_NFT_ADDRESS : undefined,
        ['function getApproved(uint256 tokenId) view returns (address)'],
        false
    )
    const [veNftApprovedMap, setVeNftApprovedMap] = useState<Record<string, boolean>>({})
    useEffect(() => {
        let mounted = true
        const fetchApprovals = async () => {
            if (!veNftContract) {
                if (mounted) setVeNftApprovedMap({})
                return
            }
            const entries: Array<[string, boolean]> = []
            for (const tokenId of selectedVeVeloNFTs) {
                try {
                    const approvedFor: string = await veNftContract.getApproved(tokenId)
                    const ok = approvedFor?.toLowerCase() === HAI_VELO_V2_TARGET.toLowerCase()
                    entries.push([tokenId, ok])
                } catch {
                    entries.push([tokenId, false])
                }
            }
            if (mounted) setVeNftApprovedMap(Object.fromEntries(entries))
        }
        fetchApprovals()
        return () => {
            mounted = false
        }
    }, [veNftContract, selectedVeVeloNFTs])

    // Build required approvals list based on selections and preflight checks
    const requiredApprovals = useMemo<HaiVeloApprovalItem[]>(() => {
        const items: HaiVeloApprovalItem[] = []

        const pushErc20IfNeeded = (label: string, symbol: string, amountStr: string, allowance?: any) => {
            const tokenMeta = tokensData[symbol]
            const addr = tokenMeta?.address
            const decimals = (tokenMeta?.decimals || 18).toString()
            const amount = String(amountStr || '0')
            const amountNum = Number(amount)
            if (!addr || amountNum <= 0) return
            // Only include if we know allowance and it's insufficient
            if (!allowance) return
            const needed = ethers.utils.parseUnits(sanitizeDecimals(amount, Number(decimals)), Number(decimals))
            if (allowance.lt(needed)) {
                items.push({ kind: 'ERC20', label, amount, tokenAddress: addr, decimals, spender: HAI_VELO_V2_TARGET })
            }
        }

        pushErc20IfNeeded('VELO', 'VELO', convertAmountVelo, veloAllowance)
        pushErc20IfNeeded('haiVELO v1', 'HAIVELO', convertAmountHaiVeloV1, haiVeloV1Allowance)

        // veVELO NFTs: include only those not approved for target
        for (const tokenId of selectedVeVeloNFTs) {
            if (!veNftApprovedMap[tokenId]) {
                items.push({
                    kind: 'ERC721_TOKEN',
                    label: `veVELO #${tokenId}`,
                    nftAddress: VE_NFT_ADDRESS,
                    tokenId,
                    spender: HAI_VELO_V2_TARGET,
                })
            }
        }

        return items
    }, [tokensData, convertAmountVelo, convertAmountHaiVeloV1, selectedVeVeloNFTs, veloAllowance, haiVeloV1Allowance, veNftApprovedMap])

    const [approvalsOpen, setApprovalsOpen] = useState(false)
    const [executionPlan, setExecutionPlan] = useState<any>(null)

    const handleStepDone = (step: 'depositVelo' | 'depositVeNfts' | 'migrateV1') => {
        switch (step) {
            case 'depositVelo':
                setConvertAmountVelo('')
                break
            case 'depositVeNfts':
                setSelectedVeVeloNFTs([])
                break
            case 'migrateV1':
                setConvertAmountHaiVeloV1('')
                break
        }
    }

    return (
        <Container>
            <Header>
                <Flex $width="100%" $justify="space-between" $align="center">
                    <Text $fontWeight={700}>Mint haiVELO</Text>
                    <Flex $gap={12} $align="center">
                        {loading && (
                            <Text $color="rgba(0,0,0,0.5)" $fontSize="0.8em">
                                Loading...
                            </Text>
                        )}
                        {error && (
                            <Text $color="red" $fontSize="0.8em">
                                Error loading balances
                            </Text>
                        )}
                        {((selectedToken === 'VELO' && Number((convertAmountVelo || '0').replace(/,/g, '')) > 0) ||
                            (selectedToken === 'haiVELO_v1' &&
                                Number((convertAmountHaiVeloV1 || '0').replace(/,/g, '')) > 0)) && (
                            <Text
                                $color="rgba(0,0,0,0.5)"
                                $fontSize="0.8em"
                                $textDecoration="underline"
                                onClick={() => {
                                    if (selectedToken === 'VELO') setConvertAmountVelo('')
                                    if (selectedToken === 'haiVELO_v1') setConvertAmountHaiVeloV1('')
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                Clear
                            </Text>
                        )}
                        {selectedToken === 'veVELO' && selectedVeVeloNFTs.length > 0 && (
                            <Text
                                $color="rgba(0,0,0,0.5)"
                                $fontSize="0.8em"
                                $textDecoration="underline"
                                onClick={() => setSelectedVeVeloNFTs([])}
                                style={{ cursor: 'pointer' }}
                            >
                                Clear NFTs
                            </Text>
                        )}
                    </Flex>
                </Flex>
            </Header>
            <Body>
                {/* Token Selection Dropdown */}
                <SelectInput
                    label="Select Token to Convert"
                    subLabel="Choose token type"
                    options={tokenOptions}
                    value={selectedToken}
                    onChange={handleTokenChange}
                />

                {/* Convert Amount Input */}
                {selectedToken === 'veVELO' ? (
                    <MultiSelectInput
                        label="Select veVELO NFTs"
                        subLabel={`Available: ${formatNumberWithStyle(parseFloat(veVeloBalanceFormatted), {
                            maxDecimals: 2,
                        })} veVELO`}
                        options={veVeloNFTOptions}
                        selectedValues={selectedVeVeloNFTs}
                        onChange={setSelectedVeVeloNFTs}
                        placeholder="Select NFTs to convert"
                    />
                ) : (
                    <NumberInput
                        label="Convert"
                        subLabel={`Available: ${getAvailableBalance(selectedToken)} ${getTokenLabel(selectedToken)}`}
                        placeholder="Amount to Convert"
                        unitLabel={getTokenLabel(selectedToken)}
                        onChange={(value: string) => {
                            if (selectedToken === 'VELO') setConvertAmountVelo(value || '')
                            if (selectedToken === 'haiVELO_v1') setConvertAmountHaiVeloV1(value || '')
                        }}
                        value={selectedToken === 'VELO' ? convertAmountVelo : convertAmountHaiVeloV1}
                        onMax={() => {
                            if (selectedToken === 'VELO') setConvertAmountVelo(getAvailableBalance(selectedToken))
                            if (selectedToken === 'haiVELO_v1') setConvertAmountHaiVeloV1(getAvailableBalance(selectedToken))
                        }}
                        conversion={
                            ((selectedToken === 'VELO' && Number((convertAmountVelo || '0').replace(/,/g, '')) > 0) ||
                            (selectedToken === 'haiVELO_v1' &&
                                Number((convertAmountHaiVeloV1 || '0').replace(/,/g, '')) > 0))
                                ? `~${formatNumberWithStyle(
                                      (selectedToken === 'VELO'
                                          ? Number((convertAmountVelo || '0').replace(/,/g, ''))
                                          : Number((convertAmountHaiVeloV1 || '0').replace(/,/g, ''))) * 1,
                                      { style: 'currency' }
                                  )}`
                                : ''
                        }
                    />
                )}

                {/* haiVELO Received (Disabled) */}
                <NumberInput
                    label="haiVELO Received"
                    subLabel="1:1 Conversion Rate" // Placeholder - should be dynamic
                    placeholder="0"
                    unitLabel="haiVELO"
                    onChange={() => {}} // No-op since it's disabled
                    value={haiVeloReceivedDisplay}
                    disabled={true}
                    conversion={
                        haiVeloReceivedTotalRaw > 0
                            ? `~${formatNumberWithStyle(
                                  haiVeloReceivedTotalRaw * 1, // Placeholder price
                                  { style: 'currency' }
                              )}`
                            : ''
                    }
                />
            </Body>
            <Footer>
                <HaiButton
                    $variant="yellowish"
                    $width="100%"
                    $justify="center"
                    disabled={!buttonActive || loading}
                    onClick={() => {
                        // Always open modal. It will show Approvals (if any) then Execute.
                        setExecutionPlan({
                            depositVeloWei: convertAmountVelo
                                ? ethers.utils.parseUnits((convertAmountVelo || '0').replace(/,/g, ''), 18).toString()
                                : undefined,
                            depositVeNftTokenIds: selectedVeVeloNFTs,
                            depositVeNftTotalWei: (() => {
                                try {
                                    const selected = veVeloNFTs.filter((n) => selectedVeVeloNFTs.includes(n.tokenId))
                                    const sum = selected.reduce(
                                        (acc, n) => acc.add(ethers.BigNumber.from(n.balance)),
                                        ethers.BigNumber.from(0)
                                    )
                                    return sum.gt(0) ? sum.toString() : undefined
                                } catch {
                                    return undefined
                                }
                            })(),
                            migrateV1Wei: convertAmountHaiVeloV1
                                ? ethers.utils
                                      .parseUnits((convertAmountHaiVeloV1 || '0').replace(/,/g, ''), 18)
                                      .toString()
                                : undefined,
                        })
                        setApprovalsOpen(true)
                        toggleModal({ modal: 'reviewTx', isOpen: true })
                    }}
                >
                    {loading ? 'Loading...' : 'Convert to haiVELO'}
                </HaiButton>
                {approvalsOpen && executionPlan && (
                    <HaiVeloTxModal
                        items={requiredApprovals}
                        plan={executionPlan}
                        onAllApproved={() => {
                            // After execution done, close
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
