import { ethers, BigNumber } from 'ethers'
import ERC20_ABI from '../abis/erc20.json'
import VESTING_ABI from '../abis/vesting.json'

const KITE_ADDRESS = '0xf467C7d5a4A9C4687fFc7986aC6aD5A4c81E1404'
const HAI_ADDRESS = '0x10398AbC267496E49106B07dd6BE13364D10dC71'
const VESTING_ADDRESS = '0x1bb64AF7FE05fc69c740609267d2AbE3e119Ef82'
const INCENTIVES_MSIG_ADDRESS = '0x21a1Ec8c62bbdad4680742B88695F06f55a51bda'
const FLX_ALIGNMENTS_MSIG_ADDRESS = '0x638d5CcAF57446363e8Ca5BD09b220EE7A87e8C6'

const formatStat = (stat: BigNumber) => parseInt(ethers.utils.formatUnits(stat))

export const kiteTokenStats = async () => {
    const provider = new ethers.providers.JsonRpcProvider(process.env.VITE_MAINNET_PUBLIC_RPC)

    const kiteERC20 = new ethers.Contract(KITE_ADDRESS, ERC20_ABI, provider)
    const vesting = new ethers.Contract(VESTING_ADDRESS, VESTING_ABI, provider)

    const totalSupply = await kiteERC20.totalSupply()
    const incentivesBal = await kiteERC20.balanceOf(INCENTIVES_MSIG_ADDRESS)
    const flxAlignmentBal = await kiteERC20.balanceOf(FLX_ALIGNMENTS_MSIG_ADDRESS)

    let totalLockedVesting = BigNumber.from(0)
    const vestingPlans = (await vesting.totalSupply()).toNumber()

    for (let i = 1; i <= vestingPlans; i++) {
        const plan = await vesting.plans(i)
        if (plan.token.toLowerCase() == KITE_ADDRESS.toLowerCase()) {
            totalLockedVesting = totalLockedVesting.add(plan.amount)
        }
    }
    const circulatingSupply = totalSupply.sub(incentivesBal).sub(flxAlignmentBal).sub(totalLockedVesting)

    return {
        totalSupply: formatStat(totalSupply),
        circulatingSupply: formatStat(circulatingSupply),
        totalLockedVesting: formatStat(totalLockedVesting),
        incentivesBal: formatStat(incentivesBal),
        flxAlignmentBal: formatStat(flxAlignmentBal),
    }
}

export const haiTokenStats = async () => {
    const provider = new ethers.providers.JsonRpcProvider(process.env.VITE_MAINNET_PUBLIC_RPC)
    const haiERC20 = new ethers.Contract(HAI_ADDRESS, ERC20_ABI, provider)
    const totalSupply = await haiERC20.totalSupply()
    return {
        totalSupply: formatStat(totalSupply),
    }
}
