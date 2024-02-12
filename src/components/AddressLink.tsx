import { useNetwork } from 'wagmi'

import { NETWORK_ID, getEtherscanLink, returnWalletAddress } from '~/utils'

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
            {children || returnWalletAddress(address)}
        </Link>
    )
}
