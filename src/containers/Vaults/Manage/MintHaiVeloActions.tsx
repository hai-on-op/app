import { useState, useMemo } from 'react'

import { formatNumberWithStyle } from '~/utils'
import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { NumberInput } from '~/components/NumberInput'
import { SelectInput, type SelectOption } from '~/components/SelectInput'
import { MultiSelectInput, type MultiSelectOption } from '~/components/MultiSelectInput'
import { useHaiVeloV2 } from '~/hooks'

type SelectedToken = 'VELO' | 'veVELO' | 'haiVELO_v1'

export function MintHaiVeloActions() {
    const [selectedToken, setSelectedToken] = useState<SelectedToken>('VELO')
    const [convertAmount, setConvertAmount] = useState<string>('')
    const [selectedVeVeloNFTs, setSelectedVeVeloNFTs] = useState<string[]>([])

    // Use the new hook to fetch VELO and veVELO balances
    const { 
        loading, 
        error, 
        veloBalanceFormatted, 
        veVeloBalanceFormatted,
        veVeloNFTs,
    } = useHaiVeloV2()

    // Token options for the select dropdown
    const tokenOptions: SelectOption<SelectedToken>[] = [
        { label: 'VELO', value: 'VELO' },
        { label: 'veVELO', value: 'veVELO' },
        { label: 'haiVELO v1', value: 'haiVELO_v1' },
    ]

    // Handle token selection change
    const handleTokenChange = (token: SelectedToken) => {
        setSelectedToken(token)
        // Clear previous selections when switching tokens
        if (token !== 'veVELO') {
            setSelectedVeVeloNFTs([])
        }
        if (token !== 'VELO' && token !== 'haiVELO_v1') {
            setConvertAmount('')
        }
    }

    // Calculate haiVELO received (1:1 peg for now)
    const haiVeloReceived = useMemo(() => {
        if (selectedToken === 'veVELO') {
            // Calculate total from selected NFTs
            const selectedNFTs = veVeloNFTs.filter(nft => selectedVeVeloNFTs.includes(nft.tokenId))
            const totalBalance = selectedNFTs.reduce((sum, nft) => sum + parseFloat(nft.balanceFormatted), 0)
            return formatNumberWithStyle(totalBalance, {
                maxDecimals: 2,
            })
        }
        
        if (!convertAmount || Number(convertAmount) <= 0) return '0'
        // For now, simple 1:1 conversion - this should be replaced with actual conversion logic
        return convertAmount
    }, [convertAmount, selectedToken, selectedVeVeloNFTs, veVeloNFTs])

    // Get token label for display
    const getTokenLabel = (token: SelectedToken): string => {
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
            label: `NFT #${nft.tokenId}`,
            value: nft.tokenId,
            description: `${formatNumberWithStyle(parseFloat(nft.balanceFormatted), {
                maxDecimals: 2,
            })} veVELO`,
        }))
    }, [veVeloNFTs])

    // Get available balance for selected token
    const getAvailableBalance = (token: SelectedToken): string => {
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
                return '0.00' // TODO: Add haiVELO v1 balance hook
            default:
                return '0.00'
        }
    }

    // Check if button should be active
    const buttonActive = useMemo(() => {
        if (selectedToken === 'veVELO') {
            return selectedVeVeloNFTs.length > 0
        }
        return Number(convertAmount) > 0
    }, [convertAmount, selectedToken, selectedVeVeloNFTs])

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
                        {Number(convertAmount) > 0 && (
                            <Text
                                $color="rgba(0,0,0,0.5)"
                                $fontSize="0.8em"
                                $textDecoration="underline"
                                onClick={() => setConvertAmount('')}
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
                        onChange={(value: string) => setConvertAmount(value || '')}
                        value={convertAmount}
                        onMax={() => {
                            // Set max to available balance
                            setConvertAmount(getAvailableBalance(selectedToken))
                        }}
                        conversion={
                            convertAmount && Number(convertAmount) > 0
                                ? `~${formatNumberWithStyle(
                                      Number(convertAmount) * 1, // Placeholder price - should use actual price
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
                    value={haiVeloReceived}
                    disabled={true}
                    conversion={
                        haiVeloReceived && Number(haiVeloReceived) > 0
                            ? `~${formatNumberWithStyle(
                                  Number(haiVeloReceived) * 1, // Placeholder price
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
                        // Placeholder for mint action
                        if (selectedToken === 'veVELO') {
                            console.log('Minting haiVELO from veVELO NFTs:', {
                                token: selectedToken,
                                selectedNFTs: selectedVeVeloNFTs,
                                totalReceived: haiVeloReceived,
                            })
                        } else {
                            console.log('Minting haiVELO:', {
                                token: selectedToken,
                                amount: convertAmount,
                                received: haiVeloReceived,
                            })
                        }
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
