import { useAccount, useNetwork } from 'wagmi'

import { NETWORK_ID, getEtherscanLink, returnWalletAddress, stringsExistAndAreEqual } from '~/utils'
import { useStoreState } from '~/store'

import { Text } from '~/styles'
import { Link, type LinkProps } from './Link'

type AddressLinkProps = Omit<LinkProps, 'type' | 'href'> & {
    chainId?: number
    address: string
    type?: 'address' | 'transaction'
    isOwner?: boolean
}

export const AddressLink = ({
    chainId,
    address,
    type = 'address',
    isOwner = false,
    children,
    ...props
}: AddressLinkProps) => {
    const { chain } = useNetwork()

    const link = isOwner ? `/vaults/${address}` : getEtherscanLink(chainId || chain?.id || NETWORK_ID, address, type)

    return (
        <Link {...props} href={link}>
            {children || <TruncatedAddress address={address} />}
        </Link>
    )
}

const TruncatedAddress = ({ address }: { address: string }) => {
    const { address: account } = useAccount()
    const {
        connectWalletModel: { proxyAddress },
    } = useStoreState((state) => state)

    if (stringsExistAndAreEqual(address, account)) return <Text>You</Text>

    if (stringsExistAndAreEqual(address, proxyAddress)) return <Text>You (Proxy)</Text>

    return <Text>{returnWalletAddress(address, { startLength: 4 })}</Text>
}
