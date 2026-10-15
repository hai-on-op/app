import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const { engines } = JSON.parse(readFileSync('package.json', 'utf8'))
assert.match(engines.node, /^\d+\.x$/, 'Pin engines.node to one Node.js major version')
const expectedRuntime = `nodejs${engines.node}`

function findFunctionConfigs(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const filename = path.join(directory, entry.name)
        if (entry.isDirectory()) return findFunctionConfigs(filename)
        return entry.name === '.vc-config.json' ? [filename] : []
    })
}

const configs = findFunctionConfigs('.vercel/output/functions')
assert.ok(configs.length > 0, 'No Vercel function configs found; run the build first')

for (const filename of configs) {
    const { runtime } = JSON.parse(readFileSync(filename, 'utf8'))
    assert.equal(runtime, expectedRuntime, `${filename} must use ${expectedRuntime}, found ${runtime}`)
}

console.log(`Verified ${configs.length} Vercel functions use ${expectedRuntime}`)
