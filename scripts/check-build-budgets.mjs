/* eslint-env node */

import { gzipSync } from 'node:zlib'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const BUILD_DIR = path.resolve(process.cwd(), 'build', 'assets')
const BUDGETS = JSON.parse(readFileSync(path.resolve(process.cwd(), 'perf', 'build-budgets.json'), 'utf8'))

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} kB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function getAssets() {
    return readdirSync(BUILD_DIR)
        .map((file) => path.join(BUILD_DIR, file))
        .filter((file) => statSync(file).isFile())
        .map((file) => {
            const content = readFileSync(file)
            return {
                file: path.relative(process.cwd(), file),
                basename: path.basename(file),
                extension: path.extname(file),
                size: content.byteLength,
                gzipSize: gzipSync(content).byteLength,
            }
        })
}

function findMainEntry(jsAssets) {
    return jsAssets
        .filter((asset) => /^index-[a-z0-9]+\.js$/i.test(asset.basename))
        .sort((a, b) => b.size - a.size)[0]
}

function findChunk(jsAssets, prefix) {
    return jsAssets.find((asset) => asset.basename.startsWith(`${prefix}-`) && asset.extension === '.js')
}

function assertBudget(label, asset, budget) {
    const failures = []

    if (!asset) {
        failures.push(`${label}: missing asset`)
        return failures
    }

    if (asset.size > budget.maxBytes) {
        failures.push(
            `${label}: ${formatBytes(asset.size)} exceeds ${formatBytes(budget.maxBytes)} (${asset.file})`
        )
    }

    if (asset.gzipSize > budget.maxGzipBytes) {
        failures.push(
            `${label}: gzip ${formatBytes(asset.gzipSize)} exceeds ${formatBytes(budget.maxGzipBytes)} (${asset.file})`
        )
    }

    return failures
}

const assets = getAssets()
const jsAssets = assets.filter((asset) => asset.extension === '.js')
const mainEntry = findMainEntry(jsAssets)
const connectChunk = findChunk(jsAssets, 'ConnectButton')
const totalJs = {
    file: 'build/assets/*.js',
    size: jsAssets.reduce((sum, asset) => sum + asset.size, 0),
    gzipSize: jsAssets.reduce((sum, asset) => sum + asset.gzipSize, 0),
}

const failures = [
    ...assertBudget('mainEntry', mainEntry, BUDGETS.mainEntry),
    ...assertBudget('totalJs', totalJs, BUDGETS.totalJs),
    ...assertBudget('connectChunk', connectChunk, BUDGETS.connectChunk),
]

console.log('Build budget summary')
console.log(
    `mainEntry   ${mainEntry?.file || 'missing'} size=${formatBytes(mainEntry?.size || 0)} gzip=${formatBytes(
        mainEntry?.gzipSize || 0
    )}`
)
console.log(`totalJs     ${formatBytes(totalJs.size)} gzip=${formatBytes(totalJs.gzipSize)}`)
console.log(
    `connectChunk ${connectChunk?.file || 'missing'} size=${formatBytes(connectChunk?.size || 0)} gzip=${formatBytes(
        connectChunk?.gzipSize || 0
    )}`
)

if (failures.length) {
    console.error('\nBuild budget failures:')
    failures.forEach((failure) => console.error(`- ${failure}`))
    process.exit(1)
}

console.log('\nAll build budgets passed.')
