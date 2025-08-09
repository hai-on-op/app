import { useMemo } from 'react'

import { formatNumberWithStyle } from '~/utils'
import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { NumberInput } from '~/components/NumberInput'
import { SelectInput, type SelectOption } from '~/components/SelectInput'
import { MultiSelectInput, type MultiSelectOption } from '~/components/MultiSelectInput'
import { useHaiVeloV2 } from '~/hooks'
import { useHaiVelo } from '~/providers/HaiVeloProvider'

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
    } = useHaiVelo()

    // Use the new hook to fetch VELO and veVELO balances
    const {
        loading,
        error,
        veloBalanceFormatted,
        veVeloBalanceFormatted,
        veVeloNFTs,
        haiVeloV1BalanceFormatted,
    } = useHaiVeloV2()

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
                        // Placeholder for mint action - aggregate all selections
                        console.log('Minting haiVELO (aggregate selections):', {
                            details: {
                                VELO: convertAmountVelo,
                                veVELO_NFTs: selectedVeVeloNFTs,
                                haiVELO_v1: convertAmountHaiVeloV1,
                            },
                            totalReceived: haiVeloReceivedTotalRaw,
                        })
                    }}
                >
                    {loading ? 'Loading...' : 'Convert to haiVELO'}
                </HaiButton>
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
