import { NETWORK_ID } from '../constants'
import { ApolloClient, InMemoryCache } from '@apollo/client'

const uri =
    NETWORK_ID === 10
        ? 'https://subgraph.satsuma-prod.com/ea4569e42b10/duuvf2ayrz8e0yxg0udnic--151680/hai-mainnet/api'
        : 'https://subgraph.satsuma-prod.com/ea4569e42b10/duuvf2ayrz8e0yxg0udnic--151680/hai-sepolia-redeploy/api'

export const client = new ApolloClient({
    uri,
    cache: new InMemoryCache(),
})
