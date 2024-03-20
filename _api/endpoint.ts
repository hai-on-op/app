import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ethers } from 'ethers'
import ERC20_ABI from '../src/abis/erc20.json'
import VESTING_ABI from '../src/abis/vesting.json'

export default async function handler(request: VercelRequest, response: VercelResponse) {
    const provider = new ethers.providers.JsonRpcProvider(process.env.VITE_MAINNET_PUBLIC_RPC)
    const address = '0xf467C7d5a4A9C4687fFc7986aC6aD5A4c81E1404'
    const vestingAddress = '0x1bb64AF7FE05fc69c740609267d2AbE3e119Ef82'
    const erc20 = new ethers.Contract(address, ERC20_ABI, provider)
    const totalSupply = ethers.utils.formatUnits(await erc20.totalSupply())
    const vesting = new ethers.Contract(vestingAddress, VESTING_ABI, provider);
    let totalLockedTokens = 0;
    const vestingSupply = await vesting.totalSupply();
    for (let i = 1; i <= vestingSupply; i++) {
        let plan = await vesting.plans(i);
        if (plan.token.toLowerCase() == address.toLowerCase()) {
            totalLockedTokens += plan.amount;
        }
    }
    const vestingTokens = ethers.utils.formatUnits(totalLockedTokens);
    response.setHeader('Content-Type', 'text/plain')
    return response.send({totalSupply, vestingTokens});
}
