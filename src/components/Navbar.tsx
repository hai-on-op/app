import { useMemo } from 'react'
import styled from 'styled-components'
import { utils } from 'ethers'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'

import { useStoreActions, useStoreState } from '@/store'
import { handleTransactionError, useEthersSigner } from '@/hooks'
import { claimAirdrop } from '@/services/blockchain'
import { formatNumber, TOKEN_LOGOS } from '@/utils'
import addIcon from '@/assets/plus.svg'
import { Icon } from './TokenInput'
import NavLinks from './NavLinks'
import Brand from './Brand'

const Navbar = () => {
    const {
        popupsModel: popupsActions,
        transactionsModel,
        connectWalletModel: connectWalletActions,
    } = useStoreActions((state) => state)
    const { connectWalletModel } = useStoreState((state) => state)

    const { address: account, isConnected } = useAccount()
    const signer = useEthersSigner()

    const handleAddHAI = async () => {
        try {
            const provider = window.ethereum as any
            await provider?.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address: connectWalletModel.tokensData.HAI.address,
                        symbol: connectWalletModel.tokensData.HAI.symbol,
                        decimals: connectWalletModel.tokensData.HAI.decimals,
                    },
                },
            })
        } catch (error) {
            console.log('Error adding HAI to the wallet:', error)
        }
    }

    const haiBalance = useMemo(() => {
        const balances = connectWalletModel.tokensFetchedData
        return formatNumber(balances.HAI ? utils.formatEther(balances.HAI.balanceE18) : '0', 2)
    }, [connectWalletModel.tokensFetchedData])

    const claimAirdropButton = async (signer: any) => {
        popupsActions.setIsWaitingModalOpen(true)
        popupsActions.setWaitingPayload({
            text: 'Claiming test tokens...',
            title: 'Waiting For Confirmation',
            hint: 'Confirm this transaction in your wallet',
            status: 'loading',
        })
        claimAirdrop(signer)
            .then((txResponse) => {
                if (txResponse) {
                    transactionsModel.addTransaction({
                        chainId: txResponse.chainId,
                        hash: txResponse.hash,
                        from: txResponse.from,
                        summary: 'Claiming test tokens',
                        addedTime: new Date().getTime(),
                        originalTx: txResponse,
                    })
                    popupsActions.setWaitingPayload({
                        title: 'Transaction Submitted',
                        hash: txResponse.hash,
                        status: 'success',
                    })
                    txResponse.wait().then(() => {
                        connectWalletActions.setForceUpdateTokens(true)
                    })
                }
            })
            .catch((error) => {
                handleTransactionError(error)
            })
    }

    return (
        <Container>
            <Left isBigWidth={isConnected && account ? true : false}>
                <Brand />
            </Left>
            <HideMobile>
                <NavLinks />
            </HideMobile>
            <RightSide>
                <BtnContainer>
                    {signer && (
                        <ClaimButton onClick={() => signer && claimAirdropButton(signer)}>
                            Claim test tokens 🪂
                        </ClaimButton>
                    )}
                    {/* Button to add HAI to the wallet */}
                    <HaiButton onClick={handleAddHAI}>
                        <Icon src={TOKEN_LOGOS.HAI} width={'24px'} height={'24px'} />
                        {haiBalance + ' '}
                        HAI
                        <AddIcon src={addIcon} width={'18px'} height={'18px'} />
                    </HaiButton>

                    {/* Button to connect wallet */}
                    <ConnectButton showBalance={false} accountStatus="address" />
                </BtnContainer>

                <MenuBtn onClick={() => popupsActions.setShowSideMenu(true)}>
                    <RectContainer>
                        <Rect />
                        <Rect />
                        <Rect />
                    </RectContainer>
                </MenuBtn>
            </RightSide>
        </Container>
    )
}

export default Navbar

const Container = styled.div`
    display: flex;
    height: 68px;
    align-items: center;
    justify-content: space-between;
    padding: 40px 40px 0 40px;
    position: relative;
    z-index: 5;
    ${({ theme }) => theme.mediaWidth.upToSmall`
     padding: 0 20px;
     top:0 !important;
  `}
`

const MenuBtn = styled.div`
    margin-right: -20px;
    width: 60px;
    height: 60px;
    align-items: center;
    justify-content: center;
    display: none;
    cursor: pointer;
    &:hover {
        div {
            div {
                background: ${(props) => props.theme.colors.gradient};
            }
        }
    }
    ${({ theme }) => theme.mediaWidth.upToSmall`
    display: flex;
  `}
`

const BtnContainer = styled.div`
    display: flex;
    align-items: center;
    ${({ theme }) => theme.mediaWidth.upToSmall`
    display: none;
  `}

    svg {
        stroke: white;
        position: relative;
        margin-right: 5px;
    }
`

const RectContainer = styled.div``

const Rect = styled.div`
    width: 15px;
    border-radius: 12px;
    height: 3px;
    margin-bottom: 2px;
    background: ${(props) => props.theme.colors.secondary};
    transition: all 0.3s ease;
    &:last-child {
        margin-bottom: 0;
    }
`

const RightSide = styled.div`
    display: flex;
    align-items: center;
`

const HideMobile = styled.div`
    height: -webkit-fill-available;
    ${({ theme }) => theme.mediaWidth.upToSmall`
    display: none;
  `}
`

const Left = styled.div<{ isBigWidth?: boolean }>`
    display: flex;
    align-items: center;
    ${({ theme }) => theme.mediaWidth.upToSmall`
    min-width:auto;
  `}
`

const AddIcon = styled(Icon)`
    margin: 0 5px 0 10px;
`

const HaiButton = styled.button`
    outline: none;
    cursor: pointer;
    border: none;
    box-shadow: none;
    padding: 8px 12px 8px 12px;
    line-height: 24px;
    font-size: ${(props) => props.theme.font.small};
    font-weight: 600;
    color: ${(props) => props.theme.colors.neutral};
    background: ${(props) => props.theme.colors.colorPrimary};
    border-radius: 50px;
    transition: all 0.3s ease;
    margin-right: 15px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;

    &:hover {
        opacity: 0.8;
    }
`

const ClaimButton = styled(HaiButton)``
