import { NETWORK_ID } from '@/utils'
import { useStoreState } from '@/store'

export function useEthBalance() {
    const { connectWalletModel } = useStoreState(state => state)
    
    return connectWalletModel.ethBalance[NETWORK_ID].toString()
}
