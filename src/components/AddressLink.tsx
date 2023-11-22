import { useNetwork } from 'wagmi'

import { getEtherscanLink, returnWalletAddress } from '~/utils'

import { ExternalLink, ExternalLinkProps } from './ExternalLink'

type AddressLinkProps = Omit<ExternalLinkProps, 'children'> & {
    chainId?: number
    address: string,
    type?: 'address' | 'transaction'
}

export const AddressLink = ({ chainId, address, type = 'address', ...props }: AddressLinkProps) => {
    const { chain } = useNetwork()

    return (
        <ExternalLink
            {...props}
            href={getEtherscanLink(chainId || chain?.id || 420, address, type)}>
            {returnWalletAddress(address)}
        </ExternalLink>
    )
}
