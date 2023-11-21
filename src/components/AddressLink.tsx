import { getEtherscanLink, returnWalletAddress } from '~/utils'

import { ExternalLink, ExternalLinkProps } from './ExternalLink'

type AddressLinkProps = Omit<ExternalLinkProps, 'children'> & {
    chainId: number
    address: string,
    type?: 'address' | 'transaction'
}

export const AddressLink = ({ chainId, address, type = 'address', ...props }: AddressLinkProps) => {
    return (
        <ExternalLink
            {...props}
            href={getEtherscanLink(chainId, address, type)}>
            {returnWalletAddress(address)}
        </ExternalLink>
    )
}
