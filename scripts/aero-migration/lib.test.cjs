'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { economicOutstanding, convert, safeBatch, integer } = require('./lib.cjs')

test('v1 retirement and v2 mint preserve economic liability without double-counting dead supply', () => {
    const before = economicOutstanding('1000000', ['0'])
    const afterV1 = economicOutstanding('1000000', ['250000'])
    const afterV2 = economicOutstanding('250000', ['0'])
    assert.equal(before, afterV1 + afterV2)
    assert.equal(convert(before, '44', '1000'), convert(afterV1, '44', '1000') + convert(afterV2, '44', '1000'))
})

test('bridge escrow and synthetic supply are one obligation', () => {
    const baseWallets = economicOutstanding('1000000', ['0', '800000'])
    const optimism = economicOutstanding('800000', ['0'])
    assert.equal(baseWallets + optimism, 1000000n)
})

test('prefunding liability rounds up while conversion output rounds down', () => {
    assert.equal(convert(1n, '44', '1000'), 0n)
    assert.equal(convert(1n, '44', '1000', true), 1n)
    assert.equal(convert(10000n * 10n ** 18n, '44', '1000'), 440n * 10n ** 18n)
})

test('rejects invalid accounting inputs and negative outstanding', () => {
    for (const invalid of ['-1', '1.5', '1e18', '', 100]) assert.throws(() => integer(invalid))
    assert.throws(() => economicOutstanding('100', ['101']))
    assert.throws(() => convert(100n, '1', '0'))
})

test('Safe payload cannot target unsupported chain, zero address, or encode negative value', () => {
    const valid = { to: '0x0000000000000000000000000000000000000001', value: '0', data: '0x12345678' }
    assert.throws(() => safeBatch(1, [valid], 'test'))
    assert.throws(() => safeBatch(10, [{ ...valid, value: '-1' }], 'test'))
    assert.throws(() => safeBatch(10, [{ ...valid, to: '0x0000000000000000000000000000000000000000' }], 'test'))
    assert.equal(safeBatch(10, [valid], 'test').chainId, '10')
})
