import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { Contract } from '@ethersproject/contracts'

import { ActionState } from '~/utils'
import { useStoreActions } from '~/store'
import { ApprovalState, useTokenApproval } from '~/hooks'
import { useContract } from '~/hooks/useContract'

import styled from 'styled-components'
import { CenteredFlex, HaiButton, Text } from '~/styles'
import { ModalBody, ModalFooter } from '../index'
import { ArrowUpCircle, CheckCircle } from 'react-feather'
import { Loader } from '~/components/Loader'

export type HaiVeloApprovalItem =
    | {
          kind: 'ERC20'
          label: string
          amount: string
          tokenAddress: string
          decimals: string
          spender: string
      }
    | {
          kind: 'ERC721_TOKEN'
          label: string
          nftAddress: string
          tokenId: string
          spender: string
      }

type ApprovalsProps = {
    items: HaiVeloApprovalItem[]
    onAllApproved: () => void
}

const ERC721_APPROVAL_ABI = [
    'function getApproved(uint256 tokenId) view returns (address)',
    'function approve(address to, uint256 tokenId) external',
]

export function Approvals({ items, onAllApproved }: ApprovalsProps) {
    const { address } = useAccount()
    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)

    // Find first item that still needs approval
    const [currentIndex, setCurrentIndex] = useState<number>(0)
    const currentItem = items[currentIndex]

    // --- Isolate state for each possible approval type to prevent stale state ---

    // ERC20 Approvals (one hook per token)
    const veloItem = useMemo(
        () => items.find((i) => i.kind === 'ERC20' && i.label === 'VELO') as Extract<HaiVeloApprovalItem, { kind: 'ERC20' }> | undefined,
        [items]
    )
    const haiVeloItem = useMemo(
        () => items.find((i) => i.kind === 'ERC20' && i.label === 'haiVELO v1') as Extract<HaiVeloApprovalItem, { kind: 'ERC20' }> | undefined,
        [items]
    )

    const [veloApprovalState, requestVeloApprove] = useTokenApproval(
        veloItem?.amount || '0',
        veloItem?.tokenAddress,
        veloItem?.spender,
        veloItem?.decimals || '18',
        true
    )
    const [haiVeloApprovalState, requestHaiVeloApprove] = useTokenApproval(
        haiVeloItem?.amount || '0',
        haiVeloItem?.tokenAddress,
        haiVeloItem?.spender,
        haiVeloItem?.decimals || '18',
        true
    )

    // ERC721 single-token approval handling
    const nftContract = useContract<Contract>(
        currentItem?.kind === 'ERC721_TOKEN' ? currentItem.nftAddress : undefined,
        ERC721_APPROVAL_ABI,
        true
    )
    const [nftApproved, setNftApproved] = useState<boolean>(false)
    const [nftPending, setNftPending] = useState<boolean>(false)

    const refreshNftApproval = useCallback(async () => {
        if (currentItem?.kind !== 'ERC721_TOKEN' || !nftContract) return
        try {
            const approvedFor: string = await nftContract.getApproved(currentItem.tokenId)
            setNftApproved(approvedFor?.toLowerCase() === currentItem.spender.toLowerCase())
        } catch (e) {
            console.error('Failed to check NFT approval', e)
            setNftApproved(false)
        }
    }, [currentItem, nftContract])

    useEffect(() => {
        setNftApproved(false)
        setNftPending(false)
        refreshNftApproval()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex])

    const approveNft = useCallback(async (): Promise<void> => {
        if (currentItem?.kind !== 'ERC721_TOKEN' || !nftContract) return
        try {
            setNftPending(true)
            popupsActions.setIsWaitingModalOpen(true)
            popupsActions.setWaitingPayload({
                title: 'Waiting for confirmation',
                text: 'Approve selected veNFT in your wallet',
                status: ActionState.LOADING,
            })
            const gas = await nftContract.estimateGas.approve(currentItem.spender, currentItem.tokenId)
            const tx = await nftContract.approve(currentItem.spender, currentItem.tokenId, { gasLimit: gas.mul(12).div(10) })
            await tx.wait()
            await refreshNftApproval()
        } catch (e) {
            console.error('Failed to approve NFT', e)
        } finally {
            setNftPending(false)
            popupsActions.setIsWaitingModalOpen(false)
            popupsActions.setWaitingPayload({ status: ActionState.NONE })
        }
    }, [currentItem, nftContract, popupsActions, refreshNftApproval])

    // Determine whether current item is approved
    const isCurrentApproved = useMemo(() => {
        if (!currentItem) return true
        if (currentItem.kind === 'ERC20') {
            if (currentItem.label === 'VELO') return veloApprovalState === ApprovalState.APPROVED
            if (currentItem.label === 'haiVELO v1') return haiVeloApprovalState === ApprovalState.APPROVED
            return false // Should not happen
        }
        return nftApproved
    }, [currentItem, veloApprovalState, haiVeloApprovalState, nftApproved])

    // Move to next or finish
    useEffect(() => {
        // If there's no item, we're done
        if (!currentItem) {
            onAllApproved()
            return
        }

        // If the current item is approved, advance to the next index
        if (isCurrentApproved) {
            setCurrentIndex((i) => i + 1)
        }
        // Otherwise, wait for user action
    }, [currentIndex, isCurrentApproved, onAllApproved, currentItem])

    const statusIcon = useMemo(() => {
        if (!currentItem) return null
        if (isCurrentApproved) return <CheckCircle width="40px" className={ActionState.SUCCESS} />
        if (currentItem.kind === 'ERC20') {
            if (currentItem.label === 'VELO' && veloApprovalState === ApprovalState.PENDING) return <Loader size={40} />
            if (currentItem.label === 'haiVELO v1' && haiVeloApprovalState === ApprovalState.PENDING) return <Loader size={40} />
        }
        if (currentItem.kind === 'ERC721_TOKEN' && nftPending) return <Loader size={40} />
        return <ArrowUpCircle width={'40px'} className={'stateless'} />
    }, [currentItem, isCurrentApproved, veloApprovalState, haiVeloApprovalState, nftPending])

    const actionButton = useMemo(() => {
        if (!currentItem || isCurrentApproved) return null

        if (currentItem.kind === 'ERC20') {
            if (currentItem.label === 'VELO') {
                const disabled = veloApprovalState === ApprovalState.PENDING
                return (
                    <HaiButton $variant="yellowish" $width="100%" $justify="center" disabled={disabled} onClick={requestVeloApprove}>
                        {disabled ? 'Pending Approval..' : `Approve ${currentItem.label}`}
                    </HaiButton>
                )
            }
            if (currentItem.label === 'haiVELO v1') {
                const disabled = haiVeloApprovalState === ApprovalState.PENDING
                return (
                    <HaiButton $variant="yellowish" $width="100%" $justify="center" disabled={disabled} onClick={requestHaiVeloApprove}>
                        {disabled ? 'Pending Approval..' : `Approve ${currentItem.label}`}
                    </HaiButton>
                )
            }
            return null
        }

        const disabled = nftPending
        return (
            <HaiButton $variant="yellowish" $width="100%" $justify="center" disabled={disabled} onClick={approveNft}>
                {disabled ? 'Pending Approval..' : `Approve ${currentItem.label}`}
            </HaiButton>
        )
    }, [currentItem, isCurrentApproved, veloApprovalState, haiVeloApprovalState, requestVeloApprove, requestHaiVeloApprove, nftPending, approveNft])

    return (
        <>
            <ModalBody>
                <ImageContainer>{statusIcon}</ImageContainer>
                <Text $fontWeight={700}>Token Approvals</Text>
                <Text>
                    {currentItem
                        ? `Allow target contract to use your ${currentItem.label} (${currentIndex + 1}/${items.length})`
                        : 'All approvals complete'}
                </Text>
            </ModalBody>
            <ModalFooter $gap={24}>{actionButton}</ModalFooter>
        </>
    )
}

const ImageContainer = styled(CenteredFlex).attrs((props) => ({
    $width: '100%',
    ...props,
}))`
    svg {
        margin-top: 12px;
        height: 40px;
        stroke: ${({ theme }) => theme.colors.blueish};
        path {
            stroke-width: 1 !important;
        }
        &.${ActionState.NONE} {
            stroke: black;
        }
        &.${ActionState.SUCCESS} {
            stroke: ${({ theme }) => theme.colors.successColor};
        }
        &.${ActionState.ERROR} {
            stroke: ${({ theme }) => theme.colors.dangerColor};
        }
    }
`

