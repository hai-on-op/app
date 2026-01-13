/**
 * MinterMultiStepModal - Approvals Step
 *
 * Handles token approvals for minting operations.
 * Generalized from HaiVeloTxModal/Approvals to support any minter protocol.
 */

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

export type MinterApprovalItem =
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
    | {
          kind: 'ERC721_COLLECTION'
          label: string
          nftAddress: string
          spender: string
      }

type ApprovalsProps = {
    items: MinterApprovalItem[]
    onAllApproved: () => void
}

const ERC721_APPROVAL_ABI = [
    'function getApproved(uint256 tokenId) view returns (address)',
    'function approve(address to, uint256 tokenId) external',
    'function isApprovedForAll(address owner, address operator) view returns (bool)',
    'function setApprovalForAll(address operator, bool approved) external',
]

export function Approvals({ items, onAllApproved }: ApprovalsProps) {
    const { address } = useAccount()
    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)

    // Find first item that still needs approval
    const [currentIndex, setCurrentIndex] = useState<number>(0)
    const currentItem = items[currentIndex]

    // Track ERC20 approval states by label
    const [erc20ApprovalStates, setErc20ApprovalStates] = useState<Record<string, ApprovalState>>({})
    const [erc20ApproveFns, setErc20ApproveFns] = useState<Record<string, () => Promise<void>>>({})

    // ERC20 Approvals - create hooks for each unique ERC20 item
    const erc20Items = useMemo(
        () => items.filter((i): i is Extract<MinterApprovalItem, { kind: 'ERC20' }> => i.kind === 'ERC20'),
        [items]
    )

    // Use individual approval hooks for each ERC20 token
    const firstErc20 = erc20Items[0]
    const secondErc20 = erc20Items[1]

    const [firstApprovalState, requestFirstApprove] = useTokenApproval(
        firstErc20?.amount || '0',
        firstErc20?.tokenAddress,
        firstErc20?.spender,
        firstErc20?.decimals || '18',
        true
    )

    const [secondApprovalState, requestSecondApprove] = useTokenApproval(
        secondErc20?.amount || '0',
        secondErc20?.tokenAddress,
        secondErc20?.spender,
        secondErc20?.decimals || '18',
        true
    )

    // Update approval states map when hooks update
    useEffect(() => {
        const newStates: Record<string, ApprovalState> = {}
        const newFns: Record<string, () => Promise<void>> = {}

        if (firstErc20) {
            newStates[firstErc20.label] = firstApprovalState
            newFns[firstErc20.label] = requestFirstApprove
        }
        if (secondErc20) {
            newStates[secondErc20.label] = secondApprovalState
            newFns[secondErc20.label] = requestSecondApprove
        }

        setErc20ApprovalStates(newStates)
        setErc20ApproveFns(newFns)
    }, [firstErc20, secondErc20, firstApprovalState, secondApprovalState, requestFirstApprove, requestSecondApprove])

    // ERC721 single-token approval handling
    const nftContract = useContract<Contract>(
        currentItem?.kind === 'ERC721_TOKEN' || currentItem?.kind === 'ERC721_COLLECTION'
            ? currentItem.nftAddress
            : undefined,
        ERC721_APPROVAL_ABI
    )
    const [nftApproved, setNftApproved] = useState<boolean>(false)
    const [collectionApproved, setCollectionApproved] = useState(false)
    const [nftPending, setNftPending] = useState<boolean>(false)

    const refreshNftApproval = useCallback(async () => {
        if (!nftContract || !address) return
        if (currentItem?.kind === 'ERC721_TOKEN') {
            try {
                const approvedFor: string = await nftContract.getApproved(currentItem.tokenId)
                setNftApproved(approvedFor?.toLowerCase() === currentItem.spender.toLowerCase())
            } catch (e) {
                console.error('Failed to check NFT approval', e)
                setNftApproved(false)
            }
        } else if (currentItem?.kind === 'ERC721_COLLECTION') {
            try {
                const isApproved = await nftContract.isApprovedForAll(address, currentItem.spender)
                setCollectionApproved(isApproved)
            } catch (e) {
                console.error('Failed to check collection approval', e)
                setCollectionApproved(false)
            }
        }
    }, [currentItem, nftContract, address])

    useEffect(() => {
        setNftApproved(false)
        setCollectionApproved(false)
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
            const tx = await nftContract.approve(currentItem.spender, currentItem.tokenId, {
                gasLimit: gas.mul(12).div(10),
            })
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

    const approveCollection = useCallback(async (): Promise<void> => {
        if (currentItem?.kind !== 'ERC721_COLLECTION' || !nftContract) return
        try {
            setNftPending(true)
            popupsActions.setIsWaitingModalOpen(true)
            popupsActions.setWaitingPayload({
                title: 'Waiting for confirmation',
                text: 'Approve all veNFTs in your wallet',
                status: ActionState.LOADING,
            })
            const gas = await nftContract.estimateGas.setApprovalForAll(currentItem.spender, true)
            const tx = await nftContract.setApprovalForAll(currentItem.spender, true, { gasLimit: gas.mul(12).div(10) })
            await tx.wait()
            await refreshNftApproval()
        } catch (e) {
            console.error('Failed to approve collection', e)
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
            const state = erc20ApprovalStates[currentItem.label]
            return state === ApprovalState.APPROVED
        }
        if (currentItem.kind === 'ERC721_TOKEN') return nftApproved
        if (currentItem.kind === 'ERC721_COLLECTION') return collectionApproved
        return false
    }, [currentItem, erc20ApprovalStates, nftApproved, collectionApproved])

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
            const state = erc20ApprovalStates[currentItem.label]
            if (state === ApprovalState.PENDING) return <Loader size={40} />
        }
        if ((currentItem.kind === 'ERC721_TOKEN' || currentItem.kind === 'ERC721_COLLECTION') && nftPending) {
            return <Loader size={40} />
        }
        return <ArrowUpCircle width={'40px'} className={'stateless'} />
    }, [currentItem, isCurrentApproved, erc20ApprovalStates, nftPending])

    const actionButton = useMemo(() => {
        if (!currentItem || isCurrentApproved) return null

        if (currentItem.kind === 'ERC20') {
            const state = erc20ApprovalStates[currentItem.label]
            const approveFn = erc20ApproveFns[currentItem.label]
            const disabled = state === ApprovalState.PENDING
            return (
                <HaiButton
                    $variant="yellowish"
                    $width="100%"
                    $justify="center"
                    disabled={disabled || !approveFn}
                    onClick={approveFn}
                >
                    {disabled ? 'Pending Approval..' : `Approve ${currentItem.label}`}
                </HaiButton>
            )
        }

        if (currentItem.kind === 'ERC721_TOKEN') {
            const disabled = nftPending
            return (
                <HaiButton
                    $variant="yellowish"
                    $width="100%"
                    $justify="center"
                    disabled={disabled}
                    onClick={approveNft}
                >
                    {disabled ? 'Pending Approval..' : `Approve ${currentItem.label}`}
                </HaiButton>
            )
        }

        if (currentItem.kind === 'ERC721_COLLECTION') {
            const disabled = nftPending
            return (
                <HaiButton
                    $variant="yellowish"
                    $width="100%"
                    $justify="center"
                    disabled={disabled}
                    onClick={approveCollection}
                >
                    {disabled ? 'Pending Approval..' : `Approve ${currentItem.label}`}
                </HaiButton>
            )
        }

        return null
    }, [currentItem, isCurrentApproved, erc20ApprovalStates, erc20ApproveFns, nftPending, approveNft, approveCollection])

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

