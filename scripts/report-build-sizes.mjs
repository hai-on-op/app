/* eslint-env node */

import { gzipSync } from 'node:zlib'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const BUILD_DIR = path.resolve(process.cwd(), 'build', 'assets')

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
            const extension = path.extname(file)
            return {
                file: path.relative(process.cwd(), file),
                extension,
                size: content.byteLength,
                gzipSize: gzipSync(content).byteLength,
            }
        })
        .sort((a, b) => b.size - a.size)
}

function printSection(title, assets) {
    if (!assets.length) return

    console.log(`\n${title}`)
    for (const asset of assets) {
        console.log(
            `${asset.file.padEnd(60)} ${formatBytes(asset.size).padStart(10)}  gzip ${formatBytes(asset.gzipSize).padStart(10)}`
        )
    }
}

const assets = getAssets()
const jsAssets = assets.filter((asset) => asset.extension === '.js')
const cssAssets = assets.filter((asset) => asset.extension === '.css')
const imageAssets = assets.filter((asset) => ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.avif'].includes(asset.extension))

const totalJs = jsAssets.reduce((sum, asset) => sum + asset.size, 0)
const totalJsGzip = jsAssets.reduce((sum, asset) => sum + asset.gzipSize, 0)

console.log('Build asset summary')
console.log(`Total JS: ${formatBytes(totalJs)} (gzip ${formatBytes(totalJsGzip)})`)
console.log(`JS assets: ${jsAssets.length}, CSS assets: ${cssAssets.length}, image assets: ${imageAssets.length}`)

printSection('Top JS assets', jsAssets.slice(0, 12))
printSection('Top CSS assets', cssAssets.slice(0, 5))
printSection('Top image assets', imageAssets.slice(0, 8))
