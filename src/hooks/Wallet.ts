import { NETWORK_ID } from '~/utils'
import store from '~/store'

export function useEthBalance() {
    return store.getState().connectWalletModel.ethBalance[NETWORK_ID].toString()
}
