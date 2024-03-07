/// <reference types="vite/client" />

interface Window {
    ethereum?: {
        isMetaMask?: true
        on?: (...args: any[]) => void
        removeListener?: (...args: any[]) => void
    }
    web3?: object
}
