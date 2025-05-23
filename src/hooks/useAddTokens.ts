import { useMemo } from 'react'
import { useAccount } from 'wagmi'

import { ActionState, addTokensToMetamask } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'

const hostedTokenImages = {
    HAI: 'https://i.postimg.cc/QdVYkNcp/hai-logo.jpg',
    KITE: 'https://i.postimg.cc/Z5g7fkLX/kite-logo.jpg',
    HAIVELO: 'https://i.postimg.cc/66YBwPjp/hai-velo.png',
}

export function useAddTokens({ isHaiVelo = false }: { isHaiVelo?: boolean } = {}) {
    const { address } = useAccount()

    const tokenImages = isHaiVelo
        ? { HAIVELO: hostedTokenImages['HAIVELO'] }
        : { HAI: hostedTokenImages['HAI'], KITE: hostedTokenImages['KITE'] }

    const {
        connectWalletModel: { tokensData },
    } = useStoreState((state) => state)
    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)

    const canAdd = useMemo(() => !!address && !!tokensData, [address, tokensData])

    const addTokens = async () => {
        if (!canAdd) return

        popupsActions.setIsWaitingModalOpen(true)
        popupsActions.setWaitingPayload({
            title: 'Waiting For Confirmation',
            text: `Adding token(s) data to wallet`,
            hint: 'Confirm this action in your wallet',
            status: ActionState.LOADING,
        })
        try {
            const wasAdded = await addTokensToMetamask(
                Object.entries(tokenImages).map(([token, image]) => ({
                    type: 'ERC20',
                    options: {
                        ...tokensData[token],
                        image,
                    },
                }))
            )
            popupsActions.setIsWaitingModalOpen(false)
            popupsActions.setWaitingPayload({ status: ActionState.NONE })
            return wasAdded
        } catch (error: any) {
            console.log(error)
        } finally {
            popupsActions.setIsWaitingModalOpen(false)
        }
    }

    return {
        canAdd,
        addTokens,
    }
}
