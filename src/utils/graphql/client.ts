import { ApolloClient, InMemoryCache } from '@apollo/client'

export const client = new ApolloClient({
    uri: 'https://subgraph.satsuma-prod.com/ea4569e42b10/duuvf2ayrz8e0yxg0udnic--151680/hai/version/v3/api',
    cache: new InMemoryCache()
})
