import { useNetwork } from 'wagmi'

import { NETWORK_ID, getEtherscanLink, returnWalletAddress } from '~/utils'

import { ExternalLink, ExternalLinkProps } from './ExternalLink'

type AddressLinkProps = Partial<ExternalLinkProps> & {
    chainId?: number
    address: string
    type?: 'address' | 'transaction'
}

export const AddressLink = ({ chainId, address, type = 'address', children, ...props }: AddressLinkProps) => {
    const { chain } = useNetwork()

    return (
        <ExternalLink {...props} href={getEtherscanLink(chainId || chain?.id || NETWORK_ID, address, type)}>
            {children || returnWalletAddress(address)}
        </ExternalLink>
    )
}
