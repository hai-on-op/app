import { InjectedConnector } from 'wagmi/connectors/injected'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { WalletConnectLegacyConnector } from 'wagmi/connectors/walletConnectLegacy'
import type { Chain } from 'wagmi/chains'

import type { Wallet } from './rainbowkitTypes'

type WalletConnectVersion = '1' | '2'

type InjectedConnectorOptions = Record<string, unknown>
type WalletConnectOptions = Record<string, unknown>
type WalletConnectQrModalOptions = Record<string, unknown>

const sharedConnectors = new Map<string, WalletConnectConnector | WalletConnectLegacyConnector>()
export const DEFAULT_WALLETCONNECT_QR_MODAL_OPTIONS = {
    explorerRecommendedWalletIds: 'NONE',
} as const
const injectedWalletIcon =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyOCIgaGVpZ2h0PSIyOCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTAgMGgyOHYyOEgweiIvPjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIxNiIgeD0iNCIgeT0iNiIgZmlsbD0idXJsKCNhKSIgcng9IjMuNSIvPjxwYXRoIGZpbGw9IiMwRTc2RkQiIGQ9Ik0xNiAxNGEzIDMgMCAwIDEgMy0zaDQuNGMuNTYgMCAuODQgMCAxLjA1NC4xMDlhMSAxIDAgMCAxIC40MzcuNDM3QzI1IDExLjc2IDI1IDEyLjA0IDI1IDEyLjZ2Mi44YzAgLjU2IDAgLjg0LS4xMDkgMS4wNTRhMSAxIDAgMCAxLS40MzcuNDM3QzI0LjI0IDE3IDIzLjk2IDE3IDIzLjQgMTdIMTlhMyAzIDAgMCAxLTMtM1oiLz48Y2lyY2xlIGN4PSIxOSIgY3k9IjE0IiByPSIxLjI1IiBmaWxsPSIjQTNEN0ZGIi8+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJhIiB4MT0iMTQiIHgyPSIxNCIgeTE9IjYiIHkyPSIyMiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIHN0b3AtY29sb3I9IiMxNzQyOTkiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwMDFFNTkiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48L3N2Zz4='
const rainbowWalletIcon =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXJfNjJfMzI5KSIvPgo8cGF0aCBkPSJNMjAgMzhIMjZDNTYuOTI3OSAzOCA4MiA2My4wNzIxIDgyIDk0VjEwMEg5NEM5Ny4zMTM3IDEwMCAxMDAgOTcuMzEzNyAxMDAgOTRDMTAwIDUzLjEzMDkgNjYuODY5MSAyMCAyNiAyMEMyMi42ODYzIDIwIDIwIDIyLjY4NjMgMjAgMjZWMzhaIiBmaWxsPSJ1cmwoI3BhaW50MV9yYWRpYWxfNjJfMzI5KSIvPgo8cGF0aCBkPSJNODQgOTRIMTAwQzEwMCA5Ny4zMTM3IDk3LjMxMzcgMTAwIDk0IDEwMEg4NFY5NFoiIGZpbGw9InVybCgjcGFpbnQyX2xpbmVhcl82Ml8zMjkpIi8+CjxwYXRoIGQ9Ik0yNiAyMEwyNiAzNkgyMEwyMCAyNkMyMCAyMi42ODYzIDIyLjY4NjMgMjAgMjYgMjBaIiBmaWxsPSJ1cmwoI3BhaW50M19saW5lYXJfNjJfMzI5KSIvPgo8cGF0aCBkPSJNMjAgMzZIMjZDNTguMDMyNSAzNiA4NCA2MS45Njc1IDg0IDk0VjEwMEg2NlY5NEM2NiA3MS45MDg2IDQ4LjA5MTQgNTQgMjYgNTRIMjBWMzZaIiBmaWxsPSJ1cmwoI3BhaW50NF9yYWRpYWxfNjJfMzI5KSIvPgo8cGF0aCBkPSJNNjggOTRIODRWMTAwSDY4Vjk0WiIgZmlsbD0idXJsKCNwYWludDVfbGluZWFyXzYyXzMyOSkiLz4KPHBhdGggZD0iTTIwIDUyTDIwIDM2TDI2IDM2TDI2IDUySDIwWiIgZmlsbD0idXJsKCNwYWludDZfbGluZWFyXzYyXzMyOSkiLz4KPHBhdGggZD0iTTIwIDYyQzIwIDY1LjMxMzcgMjIuNjg2MyA2OCAyNiA2OEM0MC4zNTk0IDY4IDUyIDc5LjY0MDYgNTIgOTRDNTIgOTcuMzEzNyA1NC42ODYzIDEwMCA1OCAxMDBINjhWOTRDNjggNzAuODA0IDQ5LjE5NiA1MiAyNiA1MkgyMFY2MloiIGZpbGw9InVybCgjcGFpbnQ3X3JhZGlhbF82Ml8zMjkpIi8+CjxwYXRoIGQ9Ik01MiA5NEg2OFYxMDBINThDNTQuNjg2MyAxMDAgNTIgOTcuMzEzNyA1MiA5NFoiIGZpbGw9InVybCgjcGFpbnQ4X3JhZGlhbF82Ml8zMjkpIi8+CjxwYXRoIGQ9Ik0yNiA2OEMyMi42ODYzIDY4IDIwIDY1LjMxMzcgMjAgNjJMMjAgNTJMMjYgNTJMMjYgNjhaIiBmaWxsPSJ1cmwoI3BhaW50OV9yYWRpYWxfNjJfMzI5KSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyXzYyXzMyOSIgeDE9IjYwIiB5MT0iMCIgeDI9IjYwIiB5Mj0iMTIwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiMxNzQyOTkiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwMDFFNTkiLz48L2xpbmVhckdyYWRpZW50Pgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50MV9yYWRpYWxfNjJfMzI5IiBjeD0iMCIgY3k9IjAiIHI9IjEiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKDI2IDk0KSByb3RhdGUoLTkwKSBzY2FsZSg3NCkiPgo8c3RvcCBvZmZzZXQ9IjAuNzcwMjc3IiBzdG9wLWNvbG9yPSIjRkY0MDAwIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzg3NTRDOSIvPgo8L3JhZGlhbEdyYWRpZW50Pgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50Ml9saW5lYXJfNjJfMzI5IiB4MT0iODMiIHkxPSI5NyIgeDI9IjEwMCIgeTI9Ijk3IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiNGRjQwMDAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM4NzU0QzkiLz48L2xpbmVhckdyYWRpZW50Pgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50M19saW5lYXJfNjJfMzI5IiB4MT0iMjMiIHkxPSIyMCIgeDI9IjIzIiB5Mj0iMzciIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iIzg3NTRDOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0ZGNDAwMCIvPgo8L2xpbmVhckdyYWRpZW50Pgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50NF9yYWRpYWxfNjJfMzI5IiBjeD0iMCIgY3k9IjAiIHI9IjEiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKDI2IDk0KSByb3RhdGUoLTkwKSBzY2FsZSg1OCkiPgo8c3RvcCBvZmZzZXQ9IjAuNzIzOTI5IiBzdG9wLWNvbG9yPSIjRkZGNzAwIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0ZGOTkwMSIvPgo8L3JhZGlhbEdyYWRpZW50Pgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50NV9saW5lYXJfNjJfMzI5IiB4MT0iNjgiIHkxPSI5NyIgeDI9Ijg0IiB5Mj0iOTciIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0ZGRjcwMCIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0ZGOTkwMSIvPgo8L2xpbmVhckdyYWRpZW50Pgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50Nl9saW5lYXJfNjJfMzI5IiB4MT0iMjMiIHkxPSI1MiIgeDI9IjIzIiB5Mj0iMzYiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0ZGRjcwMCIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0ZGOTkwMSIvPgo8L2xpbmVhckdyYWRpZW50Pgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50N19yYWRpYWxfNjJfMzI5IiBjeD0iMCIgY3k9IjAiIHI9IjEiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKDI2IDk0KSByb3RhdGUoLTkwKSBzY2FsZSg0MikiPgo8c3RvcCBvZmZzZXQ9IjAuNTk1MTMiIHN0b3AtY29sb3I9IiMwMEFBRkYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwMURBNDAiLz48L3JhZGlhbEdyYWRpZW50Pgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50OF9yYWRpYWxfNjJfMzI5IiBjeD0iMCIgY3k9IjAiIHI9IjEiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKDUxIDk3KSBzY2FsZSgxNyA0NS4zMzMzKSI+CjxzdG9wIHN0b3AtY29sb3I9IiMwMEFBRkYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwMURBNDAiLz48L3JhZGlhbEdyYWRpZW50Pgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50OV9yYWRpYWxfNjJfMzI5IiBjeD0iMCIgY3k9IjAiIHI9IjEiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKDIzIDY5KSByb3RhdGUoLTkwKSBzY2FsZSgxNyAzMjIuMzcpIj4KPHN0b3Agc3RvcC1jb2xvcj0iIzAwQUFGRiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAxREE0MCIvPgo8L3JhZGlhbEdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPgo='
const walletConnectWalletIcon =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgiIGhlaWdodD0iMjgiIHZpZXdCb3g9IjAgMCAyOCAyOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI4IiBoZWlnaHQ9IjI4IiBmaWxsPSIjM0I5OUZDIi8+CjxwYXRoIGQ9Ik04LjM4OTY5IDEwLjM3MzlDMTEuNDg4MiA3LjI3NTM4IDE2LjUxMTggNy4yNzUzOCAxOS42MTAzIDEwLjM3MzlMMTkuOTgzMiAxMC43NDY4QzIwLjEzODIgMTAuOTAxNyAyMC4xMzgyIDExLjE1MjkgMTkuOTgzMiAxMS4zMDc4TDE4LjcwNzYgMTIuNTgzNUMxOC42MzAxIDEyLjY2MDkgMTguNTA0NSAxMi42NjA5IDE4LjQyNzEgMTIuNTgzNUwxNy45MTM5IDEyLjA3MDNDMTUuNzUyMyA5LjkwODcgMTIuMjQ3NyA5LjkwODcgMTAuMDg2MSAxMi4wNzAzTDkuNTM2NTUgMTIuNjE5OEM5LjQ1OTA5IDEyLjY5NzMgOS4zMzM1IDEyLjY5NzMgOS4yNTYwNCAxMi42MTl4TDcuOTgwMzkgMTEuMzQ0MkM3LjgyNTQ3IDExLjE4OTMgNy44MjU0NyAxMC45MzgxIDcuOTgwMzkgMTAuNzgzMkw4LjM4OTY5IDEwLjM3MzlaTTIyLjI0ODUgMTMuMDEyTDIzLjM4MzggMTQuMTQ3NEMyMy41Mzg3IDE0LjMwMjMgMjMuNTM4NyAxNC41NTM1IDIzLjM4MzggMTQuNzA4NEwxOC4yNjQ1IDE5LjgyNzdDMTguMTA5NiAxOS45ODI3IDE3Ljg1ODQgMTkuOTgyNyAxNy43MDM1IDE5LjgyNzdDMTcuNzAzNSAxOS44Mjc3IDE3LjcwMzUgMTkuODI3NyAxNy43MDM1IDE5LjgyNzdMMTQuMDcwMiAxNi4xOTQ0QzE0LjAzMTQgMTYuMTU1NyAxMy45Njg2IDE2LjE1NTcgMTMuOTI5OSAxNi4xOTQ0QzEzLjkyOTkgMTYuMTk0NCAxMy45Mjk5IDE2LjE5NDQgMTMuOTI5OSAxNi4xOTQ0TDEwLjI5NjYgMTkuODI3N0MxMC4xNDE3IDE5Ljk4MjcgOS44OTA1MyAxOS45ODI3IDkuNzM1NjEgMTkuODI3OEM5LjczNTYgMTkuODI3OCA5LjczNTYgMTkuODI3NyA5LjczNTYgMTkuODI3N0w0LjYxNjE5IDE0LjcwODNDNC40NjEyNyAxNC41NTM0IDQuNDYxMjcgMTQuMzAyMiA0LjYxNjE5IDE0LjE0NzNMNS43NTE1MiAxMy4wMTJDNS45MDY0NSAxMi44NTcgNi4xNTc2MyAxMi44NTcgNi4zMTI1NSAxMy4wMTJMOS45NDU5NSAxNi42NDU0QzkuOTg0NjggMTYuNjg0MSAxMC4wNDc1IDE2LjY4NDEgMTAuMDg2MiAxNi42NDU0QzEwLjA4NjIgMTYuNjQ1NCAxMC4wODYyIDE2LjY0NTQgMTAuMDg2MiAxNi42NDU0TDEzLjcxOTQgMTMuMDEyQzEzLjg3NDMgMTIuODU3IDE0LjEyNTUgMTIuODU3IDE0LjI4MDUgMTMuMDEyQzE0LjI4MDUgMTMuMDEyIDE0LjI4MDUgMTMuMDEyIDE0LjI4MDUgMTMuMDEyTDE3LjkxMzkgMTYuNjQ1NEMxNy45NTI2IDE2LjY4NDEgMTguMDE1NCAxNi42ODQxIDE4LjA1NDEgMTYuNjQ1NEwyMS42ODc0IDEzLjAxMkMyMS44NDI0IDEyLjg1NzEgMjIuMDkzNiAxMi44NTcxIDIyLjI0ODUgMTMuMDEyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg=='

function isAndroid() {
    return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)
}

function isSmallIOS() {
    return typeof navigator !== 'undefined' && /iPhone|iPod/.test(navigator.userAgent)
}

function isLargeIOS() {
    return (
        typeof navigator !== 'undefined' &&
        (/iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
    )
}

function isIOS() {
    return isSmallIOS() || isLargeIOS()
}

function getExplicitInjectedProvider(flag: string) {
    if (typeof window === 'undefined' || typeof (window as any).ethereum === 'undefined') return undefined
    const { ethereum } = window as any
    const providers = ethereum.providers
    return providers ? providers.find((provider: any) => provider[flag]) : ethereum[flag] ? ethereum : undefined
}

function hasInjectedProvider(flag: string) {
    return Boolean(getExplicitInjectedProvider(flag))
}

function getInjectedProvider(flag: string) {
    if (typeof window === 'undefined' || typeof (window as any).ethereum === 'undefined') return undefined
    const { ethereum } = window as any
    const providers = ethereum.providers
    const provider = getExplicitInjectedProvider(flag)

    if (provider) return provider
    if (typeof providers !== 'undefined' && providers.length > 0) return providers[0]
    return ethereum
}

function getInjectedConnector({
    chains,
    flag,
    options,
}: {
    chains: Chain[]
    flag: string
    options?: InjectedConnectorOptions
}) {
    return new InjectedConnector({
        chains,
        options: {
            getProvider: () => getInjectedProvider(flag),
            ...options,
        },
    })
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

export function mergeWalletConnectOptions(options: WalletConnectOptions = {}): WalletConnectOptions {
    const qrModalOptions = isObjectRecord(options.qrModalOptions)
        ? (options.qrModalOptions as WalletConnectQrModalOptions)
        : {}

    return {
        ...options,
        qrModalOptions: {
            ...DEFAULT_WALLETCONNECT_QR_MODAL_OPTIONS,
            ...qrModalOptions,
        },
    }
}

function createWalletConnectConnector(
    version: WalletConnectVersion,
    config: ConstructorParameters<typeof WalletConnectConnector>[0]
) {
    const connector =
        version === '1' ? new WalletConnectLegacyConnector(config as any) : new WalletConnectConnector(config)
    sharedConnectors.set(JSON.stringify(config), connector)
    return connector
}

function getWalletConnectConnector({
    chains,
    options = {},
    projectId,
    version = '2',
}: {
    chains: Chain[]
    options?: WalletConnectOptions
    projectId?: string
    version?: WalletConnectVersion
}) {
    const exampleProjectId = '21fef48091f12692cad574a6f7753643'

    if (version === '2') {
        if (!projectId || projectId === '') {
            throw new Error(
                'No projectId found. Every dApp must now provide a WalletConnect Cloud projectId to enable WalletConnect v2.'
            )
        } else if (projectId === 'YOUR_PROJECT_ID' || projectId === exampleProjectId) {
            console.warn('Invalid projectId. Please create a unique WalletConnect Cloud projectId for your dApp.')
        }
    }

    const config = {
        chains,
        options:
            version === '1'
                ? {
                      qrcode: false,
                      ...options,
                  }
                : {
                      projectId: projectId === 'YOUR_PROJECT_ID' ? exampleProjectId : projectId,
                      showQrModal: false,
                      ...mergeWalletConnectOptions(options),
                  },
    }

    const serializedConfig = JSON.stringify(config)
    const sharedConnector = sharedConnectors.get(serializedConfig)
    return sharedConnector ?? createWalletConnectConnector(version, config)
}

async function getWalletConnectUri(
    connector: WalletConnectConnector | WalletConnectLegacyConnector,
    version: WalletConnectVersion
) {
    const provider: any = await connector.getProvider()
    return version === '2' ? new Promise((resolve) => provider.once('display_uri', resolve)) : provider.connector.uri
}

export function injectedWallet({
    chains,
    ...options
}: {
    chains: Chain[]
} & InjectedConnectorOptions): Wallet {
    return {
        id: 'injected',
        name: 'Browser Wallet',
        iconUrl: injectedWalletIcon,
        iconBackground: '#fff',
        hidden: ({ wallets }) =>
            wallets.some(
                (wallet) =>
                    wallet.installed &&
                    wallet.name === wallet.connector.name &&
                    (wallet.connector instanceof InjectedConnector || wallet.id === 'coinbase')
            ),
        createConnector: () => ({
            connector: new InjectedConnector({
                chains,
                options,
            }),
        }),
    }
}

export function rainbowWallet({
    chains,
    projectId,
    walletConnectOptions,
    walletConnectVersion = '2',
    ...options
}: {
    chains: Chain[]
    projectId: string
    walletConnectOptions?: WalletConnectOptions
    walletConnectVersion?: WalletConnectVersion
} & InjectedConnectorOptions): Wallet {
    const isRainbowInjected = hasInjectedProvider('isRainbow')
    const shouldUseWalletConnect = !isRainbowInjected

    return {
        id: 'rainbow',
        name: 'Rainbow',
        iconUrl: rainbowWalletIcon,
        iconBackground: '#0c2f78',
        installed: !shouldUseWalletConnect ? isRainbowInjected : undefined,
        downloadUrls: {
            android: 'https://play.google.com/store/apps/details?id=me.rainbow&referrer=utm_source%3Drainbowkit&utm_source=rainbowkit',
            ios: 'https://apps.apple.com/app/apple-store/id1457119021?pt=119997837&ct=rainbowkit&mt=8',
            mobile: 'https://rainbow.download?utm_source=rainbowkit',
            qrCode: 'https://rainbow.download?utm_source=rainbowkit&utm_medium=qrcode',
            browserExtension: 'https://rainbow.me/extension?utm_source=rainbowkit',
        },
        createConnector: () => {
            const connector = shouldUseWalletConnect
                ? getWalletConnectConnector({
                      projectId,
                      chains,
                      version: walletConnectVersion,
                      options: walletConnectOptions,
                  })
                : getInjectedConnector({ flag: 'isRainbow', chains, options })

            const getUri = async () => {
                const uri = await getWalletConnectUri(connector, walletConnectVersion)
                return isAndroid()
                    ? uri
                    : isIOS()
                      ? `rainbow://wc?uri=${encodeURIComponent(String(uri))}&connector=rainbowkit`
                      : `https://rnbwapp.com/wc?uri=${encodeURIComponent(String(uri))}&connector=rainbowkit`
            }

            return {
                connector,
                mobile: { getUri: shouldUseWalletConnect ? getUri : undefined },
                qrCode: shouldUseWalletConnect
                    ? {
                          getUri,
                          instructions: {
                              learnMoreUrl:
                                  'https://learn.rainbow.me/connect-to-a-website-or-app?utm_source=rainbowkit&utm_medium=connector&utm_campaign=learnmore',
                              steps: [
                                  {
                                      description:
                                          'We recommend putting Rainbow on your home screen for faster access to your wallet.',
                                      step: 'install',
                                      title: 'Open the Rainbow app',
                                  },
                                  {
                                      description:
                                          'You can easily backup your wallet using our backup feature on your phone.',
                                      step: 'create',
                                      title: 'Create or Import a Wallet',
                                  },
                                  {
                                      description:
                                          'After you scan, a connection prompt will appear for you to connect your wallet.',
                                      step: 'scan',
                                      title: 'Tap the scan button',
                                  },
                              ],
                          },
                      }
                    : undefined,
            }
        },
    }
}

export function walletConnectWallet({
    chains,
    options,
    projectId,
    version = '2',
}: {
    chains: Chain[]
    options?: WalletConnectOptions
    projectId: string
    version?: WalletConnectVersion
}): Wallet {
    return {
        id: 'walletConnect',
        name: 'WalletConnect',
        iconUrl: walletConnectWalletIcon,
        iconBackground: '#3b99fc',
        createConnector: () => {
            const ios = isIOS()
            const connector =
                version === '1'
                    ? getWalletConnectConnector({
                          version: '1',
                          chains,
                          options: {
                              qrcode: ios,
                              ...options,
                          },
                      })
                    : getWalletConnectConnector({
                          version: '2',
                          chains,
                          projectId,
                          options: {
                              showQrModal: ios,
                              ...options,
                          },
                      })

            const getUri = async () => getWalletConnectUri(connector, version)

            return {
                connector,
                ...(ios
                    ? {}
                    : {
                          mobile: { getUri },
                          qrCode: { getUri },
                      }),
            }
        },
    }
}
