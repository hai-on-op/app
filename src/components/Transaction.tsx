import { AlertTriangle, ArrowUpRight, CheckCircle } from 'react-feather'
import { useNetwork } from 'wagmi'

import { getEtherscanLink } from '~/utils'
import { useStoreState } from '~/store'

import styled from 'styled-components'
import { ExternalLinkArrow } from '~/styles'
import { Loader } from './Loader'

const Transaction = ({ hash }: { hash: string }) => {
    const { chain } = useNetwork()
    const chainId = chain?.id
    const { transactionsModel: transactionsState } = useStoreState((state) => state)

    const { summary, receipt } = transactionsState.transactions?.[hash] || {}
    const pending = !receipt
    const success = !pending && (receipt.status === 1 || typeof receipt.status === 'undefined')

    if (!chainId) return null
    return (
        <Container>
            <a
                href={getEtherscanLink(chainId, hash, 'transaction')}
                target="_blank"
                rel="noopener noreferrer">
                <Text>
                    {summary ?? hash} <ArrowUpRight />
                </Text>
                <IconWrapper
                    pending={pending}
                    success={success}>
                    {pending
                        ? <Loader />
                        : success
                            ? <CheckCircle size="16" />
                            : <AlertTriangle size="16" />
                    }
                </IconWrapper>
            </a>
        </Container>
    )
}

export default Transaction

const Container = styled.div`
    a {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
`

const Text = styled.div`
    display: flex;
    align-items: center;
    ${ExternalLinkArrow}
    svg {
        width: 14px;
        height: 14px;
        margin-left: 5px;
    }
`

const IconWrapper = styled.div<{ pending: boolean; success?: boolean }>`
    color: ${({ theme, pending, success }) => (pending
        ? theme.colors.inputBorderColor
        : success
            ? 'green'
            : 'red'
    )};
    svg {
        margin-right: 0;
    }
`
