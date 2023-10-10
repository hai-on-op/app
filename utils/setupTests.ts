// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import path from 'path'
import '@testing-library/jest-dom/extend-expect'
import { ethers } from 'ethers'
import { Geb } from '@hai-on-op/sdk'

import dotenv from 'dotenv'

const env = dotenv.config({
    path: path.resolve(__dirname, '../.env.development.local'),
})

// Object.defineProperty(global, 'crypto', {
//     value: {
//         getRandomValues: (arr: any) => crypto.randomBytes(arr.length),
//     },
// })

jest.setTimeout(10_000)

export const provider = new ethers.providers.JsonRpcProvider(env.parsed?.REACT_APP_NETWORK_URL)
const network_name = env.parsed?.REACT_APP_NETWORK_ID === '1' ? 'mainnet' : 'optimism-goerli'
export const geb = new Geb(network_name, provider)
