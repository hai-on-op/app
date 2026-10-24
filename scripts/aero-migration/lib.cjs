'use strict'

const { utils } = require('ethers')
const deployments = require('./aero-deployments.json')
const SAFE = '0x7F4735237c41F7F8578A9C7d10A11e3BCFa3D4A3'
const DEAD = '0x000000000000000000000000000000000000dEaD'
const ZERO = '0x0000000000000000000000000000000000000000'
const CHAINS = {
    base: {
        id: 8453,
        rpc: () => process.env.BASE_RPC_URL || 'https://mainnet.base.org',
        legacyToken: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
        legacyEscrow: '0xeBf418Fe2512e7E6bd9b87a8F0f294aCDC67e6B4',
        migration: 'aerodrome-migration',
        wrappers: [
            {
                name: 'haiAERO Base',
                address: '0x10398AbC267496E49106B07dd6BE13364D10dC71',
                numerator: '1',
                denominator: '1',
                duplicateCustody: '0xd605046d24cdad37ca2dff3aa8ebf254ceee86d5',
            },
        ],
    },
    optimism: {
        id: 10,
        rpc: () => process.env.OP_RPC_URL || 'https://mainnet.optimism.io',
        legacyToken: '0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db',
        legacyEscrow: '0xFAf8FD17D9840595845582fCB047DF13f006787d',
        migration: 'velodrome-migration',
        wrappers: [
            {
                name: 'haiVELO v1',
                address: '0x70f3713512089736661F928B291d1443C8b1BB6A',
                numerator: '44',
                denominator: '1000',
            },
            {
                name: 'haiVELO v2',
                address: '0x20A7EaF4a922DF50b312ef61AeA8B6E1deb5DdD6',
                numerator: '44',
                denominator: '1000',
            },
            {
                name: 'haiAERO OP',
                address: '0xbdF4A4Cc124d9A83a5774574fcBE45DC5d1f1152',
                numerator: '1',
                denominator: '1',
            },
        ],
    },
}

function assert(condition, message) {
    if (!condition) throw new Error(message)
}

function integer(value, label = 'amount') {
    assert(typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value), `Invalid unsigned integer: ${label}`)
    return BigInt(value)
}

function economicOutstanding(supply, excludedBalances) {
    const total = integer(supply, 'supply')
    const excluded = excludedBalances.reduce((sum, amount) => sum + integer(amount, 'excluded balance'), 0n)
    assert(excluded <= total, 'Excluded balances exceed supply')
    return total - excluded
}

function convert(amount, numerator, denominator, roundUp = false) {
    const n = integer(numerator, 'numerator')
    const d = integer(denominator, 'denominator')
    assert(n > 0n && d > 0n && amount >= 0n, 'Invalid conversion')
    const product = amount * n
    return (product + (roundUp ? d - 1n : 0n)) / d
}

function encode(signature, args) {
    const iface = new utils.Interface([`function ${signature}`])
    return iface.encodeFunctionData(signature.split('(')[0], args)
}

async function rpc(url, method, params) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(30000),
    })
    assert(response.ok, `RPC HTTP ${response.status} for ${method}`)
    const body = await response.json()
    assert(
        !body.error && body.result !== undefined,
        `RPC failed for ${method}: ${body.error?.message || 'missing result'}`
    )
    return body.result
}

async function read(url, block, address, signature, args = []) {
    const iface = new utils.Interface([`function ${signature}`])
    const name = signature.split('(')[0]
    const result = await rpc(url, 'eth_call', [{ to: address, data: iface.encodeFunctionData(name, args) }, block])
    return iface.decodeFunctionResult(name, result)
}

async function verifyDeployments(network, block) {
    const chain = CHAINS[network]
    assert(chain, 'Unsupported chain')
    const url = chain.rpc()
    assert(Number(await rpc(url, 'eth_chainId', [])) === chain.id, 'RPC chain mismatch')
    const results = {}
    for (const [name, expected] of Object.entries(deployments.contracts)) {
        if (expected.chainId !== chain.id) continue
        const code = await rpc(url, 'eth_getCode', [expected.address, block])
        const hash = utils.keccak256(code)
        assert(code !== '0x' && hash === expected.codeHash, `Runtime hash mismatch: ${name}`)
        results[name] = { address: expected.address, codeHash: hash }
    }
    return results
}

function safeBatch(chainId, transactions, description) {
    assert([10, 8453].includes(chainId), 'Unsupported Safe chain')
    assert(transactions.length > 0, 'Empty Safe batch')
    for (const tx of transactions) {
        assert(utils.isAddress(tx.to) && tx.to.toLowerCase() !== ZERO, 'Invalid transaction target')
        integer(tx.value, 'transaction value')
        assert(/^0x[0-9a-fA-F]*$/.test(tx.data), 'Invalid transaction data')
    }
    return {
        version: '1.0',
        chainId: String(chainId),
        createdAt: Date.now(),
        meta: {
            name: 'HAI Aero backing migration',
            description,
            txBuilderVersion: '1.18.0',
            createdFromSafeAddress: SAFE,
        },
        transactions: transactions.map((tx) => ({ ...tx, contractMethod: null, contractInputsValues: null })),
    }
}

module.exports = {
    SAFE,
    DEAD,
    ZERO,
    CHAINS,
    deployments,
    assert,
    integer,
    economicOutstanding,
    convert,
    encode,
    rpc,
    read,
    verifyDeployments,
    safeBatch,
}
