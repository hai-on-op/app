import { useTranslation } from 'react-i18next'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import styled from 'styled-components'
import { useAccount } from 'wagmi'

import { useGetAuctions, useLoadMoreAuctions } from '~/hooks'
import { useStoreActions, useStoreState } from '~/store'
import AuctionBlock from '~/components/AuctionBlock'
import { SideLabel } from '../Safes/CreateSafe'
import { TOKEN_LOGOS } from '~/utils'
import Dropdown from '~/components/Dropdown'
import { AuctionEventType, IAuction } from '~/types'
import Button from '~/components/Button'
import Loader from '~/components/Loader'

export type Item = {
    name: string
    icon: string
    symbol: string
    href?: string
    isExternal?: boolean
    [U: string]: boolean | number | string | undefined
}

interface Props {
    type: AuctionEventType
    selectedItem: string
    setSelectedItem: (item: string) => void
}
const AuctionsList = ({ type, selectedItem, setSelectedItem }: Props) => {
    const { t } = useTranslation()
    const { address: account } = useAccount()
    const { popupsModel: popupsActions } = useStoreActions((state) => state)

    const { auctionModel: auctionsState, connectWalletModel: connectWalletState } = useStoreState((state) => state)

    const { openConnectModal } = useConnectModal()
    const handleConnectWallet = () => openConnectModal && openConnectModal()

    // internalbalance = user's HAI balance in the protocol
    // protInternalBalance = user's KITE balance in the protocol
    const { internalBalance, protInternalBalance } = auctionsState

    const { proxyAddress, tokensData } = connectWalletState

    // auctions list
    const auctions = useGetAuctions(type, selectedItem) as IAuction[]
    const { LoadMoreButton, numberOfAuctions } = useLoadMoreAuctions({ auctions })

    // handle clicking to claim
    const handleClick = (modalType: string) => {
        if (!account) {
            handleConnectWallet()
            return
        }

        if (!proxyAddress) {
            popupsActions.setIsProxyModalOpen(true)
            popupsActions.setReturnProxyFunction((storeActions: any) => {
                storeActions.popupsModel.setAuctionOperationPayload({
                    isOpen: true,
                    type: modalType,
                    auctionType: type,
                })
            })
            return
        }

        popupsActions.setAuctionOperationPayload({
            isOpen: true,
            type: modalType,
            auctionType: type,
        })
    }

    const collaterals = tokensData && Object.values(tokensData).filter((token) => token.isCollateral)
    const collateralsDropdown = collaterals?.map((collateral) => {
        return { name: collateral.symbol, icon: TOKEN_LOGOS[collateral.symbol] }
    })

    const dropdownSelected = collateralsDropdown?.find((item) => item.name === selectedItem)!

    return (
        <Container>
            {type === 'COLLATERAL' && collateralsDropdown && dropdownSelected && (
                <DropdownContainer>
                    <SideLabel>{`Select Collateral Type`}</SideLabel>
                    <Dropdown
                        items={collateralsDropdown!}
                        itemSelected={dropdownSelected!}
                        getSelectedItem={setSelectedItem}
                    />
                </DropdownContainer>
            )}
            <InfoBox>
                <Box>
                    <Title>{type.toLowerCase()} Auctions</Title>
                    {account &&
                    auctions &&
                    auctions.length &&
                    (Number(internalBalance) >= 0.0001 || Number(protInternalBalance) >= 0.0001) ? (
                        <Button text={t('claim_tokens')} onClick={() => handleClick('claim_tokens')} />
                    ) : null}
                </Box>
            </InfoBox>
            {!auctions ? (
                <Loader text="Loading..." />
            ) : auctions.length > 0 ? (
                <>
                    {auctions.slice(0, numberOfAuctions).map((auction, i: number) => (
                        <AuctionBlock key={auction.auctionId} {...{ ...auction, isCollapsed: i !== 0 }} />
                    ))}

                    <LoadMoreButton />
                </>
            ) : (
                <NoData>
                    {t('no_auctions', {
                        type: type.toLowerCase(),
                    })}
                </NoData>
            )}
        </Container>
    )
}

export default AuctionsList

const Container = styled.div`
    margin-top: 40px;
    padding: 30px 20px;
    border-radius: 15px;
    background: ${(props) => props.theme.colors.colorSecondary};
`

const Title = styled.div`
    font-size: ${(props) => props.theme.font.default};
    font-weight: bold;
    text-transform: capitalize !important;
`

const Box = styled.div`
    display: flex;
    align-items: center;
`

const InfoBox = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    button {
        min-width: 100px;
        padding: 4px 12px;
        margin-left: 30px;
    }
    margin-bottom: 20px;
    span {
        margin-right: 20px;
        font-size: 12px;
    }
`

const NoData = styled.div`
    border-radius: 15px;
    margin-bottom: 15px;
    background: ${(props) => props.theme.colors.background};
    padding: 2rem 20px;
    text-align: center;
    font-size: ${(props) => props.theme.font.small};
`
const DropdownContainer = styled.div`
    margin-bottom: 20px;
`
