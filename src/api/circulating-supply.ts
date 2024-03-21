import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ethers, BigNumber } from 'ethers'
import ERC20_ABI from '../abis/erc20.json'
import VESTING_ABI from '../abis/vesting.json'

export default async function handler(request: VercelRequest, response: VercelResponse) {
    const provider = new ethers.providers.JsonRpcProvider(process.env.VITE_MAINNET_PUBLIC_RPC)
    const address = '0xf467C7d5a4A9C4687fFc7986aC6aD5A4c81E1404'
    const vestingAddress = '0x1bb64AF7FE05fc69c740609267d2AbE3e119Ef82'
    const incentivesAddress = '0x21a1Ec8c62bbdad4680742B88695F06f55a51bda'
    const flxAlignmentsAddress = '0x638d5CcAF57446363e8Ca5BD09b220EE7A87e8C6'
    const erc20 = new ethers.Contract(address, ERC20_ABI, provider)

    const totalSupply = await erc20.totalSupply()

    const incentivesBal = await erc20.balanceOf(incentivesAddress)
    const flxAlignmentBal = await erc20.balanceOf(flxAlignmentsAddress)

    const vesting = new ethers.Contract(vestingAddress, VESTING_ABI, provider)
    let totalLockedVesting = BigNumber.from(0)
    const vestingSupply = (await vesting.totalSupply()).toNumber()
    for (let i = 1; i <= vestingSupply; i++) {
        let plan = await vesting.plans(i)
        if (plan.token.toLowerCase() == address.toLowerCase()) {
            totalLockedVesting = totalLockedVesting.add(plan.amount)
        }
    }
    const circulatingSupply = totalSupply.sub(incentivesBal).sub(flxAlignmentBal).sub(totalLockedVesting)

    response.setHeader('Content-Type', 'text/plain')
    return response.send({
        circulatingSupply: ethers.utils.formatUnits(circulatingSupply),
        totalSupply: ethers.utils.formatUnits(totalSupply),
        totalLockedVesting: ethers.utils.formatUnits(totalLockedVesting),
        incentivesBal: ethers.utils.formatUnits(incentivesBal),
        flxAlignmentBal: ethers.utils.formatUnits(flxAlignmentBal),
    })
}
