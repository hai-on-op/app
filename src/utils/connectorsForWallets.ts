import type { Connector } from 'wagmi'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'

import type { Wallet, WalletList } from './rainbowkitTypes'

type WalletInstance = Omit<Wallet, 'createConnector' | 'hidden'> &
    ReturnType<Wallet['createConnector']> & {
        index: number
        groupIndex: number
        groupName: string
        walletConnectModalConnector?: Connector
    }

function isHexString(value?: string) {
    return !!value && /^0x[0-9a-fA-F]+$/.test(value)
}

function isMobileDevice() {
    if (typeof window === 'undefined') return false
    return /android|iphone|ipad|ipod|iemobile|opera mini/i.test(window.navigator.userAgent)
}

function omitUndefinedValues<T extends object>(value: T) {
    return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as Record<
        string,
        unknown
    >
}

// Importing RainbowKit's top-level connectors helper pulls in the full wallet registry.
// Keep a local copy so our wallet config only includes the three wallets we actually use.
export function connectorsForWallets(walletList: WalletList) {
    return () => {
        let index = -1
        const connectors: Connector[] = []
        const visibleWallets: Array<
            Wallet & {
                groupIndex: number
                groupName: string
                index: number
            }
        > = []
        const potentiallyHiddenWallets: typeof visibleWallets = []
        const walletInstances: WalletInstance[] = []

        walletList.forEach(({ groupName, wallets }, groupIndex) => {
            wallets.forEach((wallet) => {
                index += 1

                if (wallet?.iconAccent && !isHexString(wallet.iconAccent)) {
                    throw new Error(`Property \`iconAccent\` is not a hex value for wallet: ${wallet.name}`)
                }

                const walletListItem = {
                    ...wallet,
                    groupIndex,
                    groupName,
                    index,
                }

                if (typeof wallet.hidden === 'function') {
                    potentiallyHiddenWallets.push(walletListItem)
                } else {
                    visibleWallets.push(walletListItem)
                }
            })
        })

        const walletListItems = [...visibleWallets, ...potentiallyHiddenWallets]

        walletListItems.forEach(({ createConnector, groupIndex, groupName, hidden, index, ...walletMeta }) => {
            if (typeof hidden === 'function') {
                const isHidden = hidden({
                    wallets: walletInstances.map(({ connector, id, installed, name }) => ({
                        connector,
                        id,
                        installed,
                        name,
                    })),
                })

                if (isHidden) return
            }

            const { connector, ...connectionMethods } = omitUndefinedValues(createConnector()) as ReturnType<
                Wallet['createConnector']
            >
            let walletConnectModalConnector: Connector | undefined

            if (walletMeta.id === 'walletConnect' && connectionMethods.qrCode && !isMobileDevice()) {
                const { chains, options } = connector as WalletConnectConnector
                walletConnectModalConnector = new WalletConnectConnector({
                    chains,
                    options: {
                        ...options,
                        showQrModal: true,
                    },
                })
                connectors.push(walletConnectModalConnector)
            }

            const walletInstance: WalletInstance = {
                connector,
                groupIndex,
                groupName,
                index,
                walletConnectModalConnector,
                ...walletMeta,
                ...connectionMethods,
            }

            walletInstances.push(walletInstance)

            if (!connectors.includes(connector)) {
                connectors.push(connector)
                ;(connector as Connector & { _wallets?: WalletInstance[] })._wallets = []
            }

            ;(connector as Connector & { _wallets?: WalletInstance[] })._wallets?.push(walletInstance)
        })

        return connectors
    }
}
