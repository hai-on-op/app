import { BigNumber, ethers } from 'ethers'
import type { ContractCodeIdentity, VerifiedContractDeployment } from './registry'

const IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
const BEACON_SLOT = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50'
const hashPattern = /^0x[0-9a-f]{64}$/i
const equal = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

export async function verifyContractCode(
    identity: ContractCodeIdentity,
    provider: ethers.providers.Provider,
    block: number
) {
    if (
        !ethers.utils.isAddress(identity.address) ||
        identity.address === ethers.constants.AddressZero ||
        !hashPattern.test(identity.runtimeCodeHash)
    )
        throw new Error('Missing reviewed contract identity.')
    const [code, slot, beacon] = await Promise.all([
        provider.getCode(identity.address, block),
        provider.getStorageAt(identity.address, IMPLEMENTATION_SLOT, block),
        provider.getStorageAt(identity.address, BEACON_SLOT, block),
    ])
    if (code === '0x' || !equal(ethers.utils.keccak256(code), identity.runtimeCodeHash))
        throw new Error('Contract runtime does not match its verified deployment.')
    if (!BigNumber.from(beacon).isZero()) throw new Error('Beacon proxies require a separate verified integration.')
    if (!BigNumber.from(slot).isZero()) {
        const actual = ethers.utils.getAddress(ethers.utils.hexDataSlice(slot, 12))
        if (!identity.implementation || !equal(actual, identity.implementation.address))
            throw new Error('Proxy implementation changed or is unverified.')
        const implementationCode = await provider.getCode(actual, block)
        if (
            implementationCode === '0x' ||
            !equal(ethers.utils.keccak256(implementationCode), identity.implementation.runtimeCodeHash)
        )
            throw new Error('Implementation runtime changed.')
    } else if (identity.implementation) throw new Error('Expected proxy implementation is missing.')
}

/** Verify CREATE receipts or an explicitly reviewed factory's address-bearing deployment event. */
export async function verifyContractEvidence(
    contract: VerifiedContractDeployment,
    provider: ethers.providers.Provider,
    blockNumber: number
) {
    await verifyContractCode(contract, provider, blockNumber)
    const [receipt, block] = await Promise.all([
        provider.getTransactionReceipt(contract.deploymentTransactionHash),
        provider.getBlock(contract.deploymentBlockNumber),
    ])
    if (
        !receipt ||
        receipt.status !== 1 ||
        receipt.blockNumber !== contract.deploymentBlockNumber ||
        !equal(receipt.blockHash, contract.deploymentBlockHash) ||
        !block ||
        !equal(block.hash, contract.deploymentBlockHash) ||
        receipt.confirmations < 2
    )
        throw new Error('Deployment receipt is missing or not confirmed.')
    if (receipt.contractAddress && equal(receipt.contractAddress, contract.address)) return
    const proof = contract.factoryDeployment
    if (!proof) throw new Error('Factory-created contract requires reviewed deployment-event evidence.')
    await verifyContractCode(proof.factory, provider, contract.deploymentBlockNumber)
    const abi = new ethers.utils.Interface([proof.eventAbi])
    if (Object.keys(abi.events).length !== 1 || !proof.addressArgument)
        throw new Error('Invalid reviewed factory event.')
    const matched = receipt.logs.some((log) => {
        if (!equal(log.address, proof.factory.address)) return false
        try {
            const event = abi.parseLog(log)
            const createdAddress = event.args[proof.addressArgument]
            return (
                typeof createdAddress === 'string' &&
                ethers.utils.isAddress(createdAddress) &&
                equal(createdAddress, contract.address)
            )
        } catch {
            return false
        }
    })
    if (!matched) throw new Error('Factory receipt does not prove deployment of the reviewed contract address.')
}
