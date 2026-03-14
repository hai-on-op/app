/* eslint-env node */

import { spawn } from 'node:child_process'
import { mkdtempSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'
import WebSocket from 'ws'

const LOCAL_BASE_URL = 'http://127.0.0.1:4173'
const BASE_URL = process.env.SMOKE_BASE_URL || LOCAL_BASE_URL
const DEBUG_PORT = Number(process.env.SMOKE_DEBUG_PORT || 9226)
const ROUTES = ['/', '/vaults?tab=available', '/analytics', '/earn', '/stake']
const IGNORED_FAILED_URL_PATTERNS = [/_vercel\/insights\/script\.js/]
const IGNORED_CONSOLE_PATTERNS = [
    /Download the React DevTools/i,
    /Apollo DevTools/i,
    /\[Vercel Web Analytics\] Failed to load script/i,
]
const YOUTUBE_URL_PATTERNS = [/youtube\.com/i, /youtu\.be/i, /googlevideo\.com/i, /ytimg\.com/i]

function formatBytes(bytes) {
    if (!bytes) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} kB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function getJson(port, route) {
    return new Promise((resolve, reject) => {
        http.get({ host: '127.0.0.1', port, path: route }, (res) => {
            let data = ''
            res.on('data', (chunk) => {
                data += chunk
            })
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data))
                } catch (error) {
                    reject(error)
                }
            })
        }).on('error', reject)
    })
}

async function waitForHttpReady(url, timeoutMs = 15_000) {
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
        try {
            await new Promise((resolve, reject) => {
                const req = http.get(url, (res) => {
                    res.resume()
                    resolve()
                })
                req.on('error', reject)
            })
            return
        } catch {
            await delay(250)
        }
    }

    throw new Error(`Timed out waiting for ${url}`)
}

function detectChromeBinary() {
    if (process.env.CHROME_BIN) return process.env.CHROME_BIN

    const candidates = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
    ]

    return candidates.find((candidate) => existsSync(candidate))
}

function spawnLoggedProcess(command, args, name, extraEnv = {}) {
    const child = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...extraEnv },
    })

    child.stdout.on('data', (chunk) => {
        process.stdout.write(`[${name}] ${chunk}`)
    })

    child.stderr.on('data', (chunk) => {
        process.stderr.write(`[${name}] ${chunk}`)
    })

    return child
}

function createConnectionHelpers(ws) {
    let nextId = 0
    const pending = new Map()
    const listeners = new Map()

    ws.on('message', (raw) => {
        const message = JSON.parse(raw.toString())

        if (message.id) {
            const resolver = pending.get(message.id)
            if (!resolver) return

            pending.delete(message.id)
            if (message.error) resolver.reject(new Error(JSON.stringify(message.error)))
            else resolver.resolve(message.result)
            return
        }

        for (const listener of listeners.get(message.method) || []) {
            listener(message.params || {})
        }
    })

    return {
        send(method, params = {}) {
            return new Promise((resolve, reject) => {
                const id = ++nextId
                pending.set(id, { resolve, reject })
                ws.send(JSON.stringify({ id, method, params }))
            })
        },
        on(event, handler) {
            if (!listeners.has(event)) listeners.set(event, [])
            listeners.get(event).push(handler)
        },
    }
}

async function connectToPage(port) {
    const targets = await getJson(port, '/json/list')
    const page = targets.find((target) => target.type === 'page')

    if (!page?.webSocketDebuggerUrl) {
        throw new Error('No DevTools page target found')
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
        ws.once('open', resolve)
        ws.once('error', reject)
    })

    return { ws, ...createConnectionHelpers(ws) }
}

function stripIgnoredConsole(entries) {
    return entries.filter((entry) => !IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(String(entry.text))))
}

function stripIgnoredFailures(entries) {
    return entries.filter((entry) => !IGNORED_FAILED_URL_PATTERNS.some((pattern) => pattern.test(entry.url)))
}

async function main() {
    const previewProcess =
        BASE_URL === LOCAL_BASE_URL
            ? spawnLoggedProcess(
                  'yarn',
                  ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'],
                  'preview'
              )
            : null

    const chromeBinary = detectChromeBinary()
    if (!chromeBinary) {
        throw new Error('Unable to locate Chrome/Chromium binary. Set CHROME_BIN to continue.')
    }

    const chromeUserDataDir = mkdtempSync(path.join(tmpdir(), 'hai-perf-smoke-'))
    const chromeProcess = spawnLoggedProcess(
        chromeBinary,
        [
            '--headless=new',
            '--disable-gpu',
            '--no-first-run',
            '--no-default-browser-check',
            `--remote-debugging-port=${DEBUG_PORT}`,
            `--user-data-dir=${chromeUserDataDir}`,
            `${BASE_URL}/`,
        ],
        'chrome'
    )

    const cleanup = () => {
        if (previewProcess && !previewProcess.killed) previewProcess.kill('SIGTERM')
        if (!chromeProcess.killed) chromeProcess.kill('SIGTERM')
        try {
            rmSync(chromeUserDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
        } catch {
            // Chrome may keep profile files open briefly while shutting down.
        }
    }

    process.on('exit', cleanup)
    process.on('SIGINT', () => {
        cleanup()
        process.exit(130)
    })
    process.on('SIGTERM', () => {
        cleanup()
        process.exit(143)
    })

    if (previewProcess) {
        await waitForHttpReady(BASE_URL)
    }

    await waitForHttpReady(`http://127.0.0.1:${DEBUG_PORT}/json/version`)

    const { ws, send, on } = await connectToPage(DEBUG_PORT)
    const routeData = {}
    const requestMeta = new Map()
    let currentRoute = ROUTES[0]

    const ensureRoute = (route) =>
        routeData[route] ||
        (routeData[route] = { requests: [], failed: [], console: [], exceptions: [], metrics: {}, checks: {} })

    on('Network.requestWillBeSent', (params) => {
        const route = currentRoute
        requestMeta.set(params.requestId, {
            route,
            url: params.request.url,
            postData: params.request.postData,
        })
        ensureRoute(route).requests.push(params.request.url)
    })

    on('Network.loadingFailed', (params) => {
        const meta = requestMeta.get(params.requestId) || {}
        const route = meta.route || currentRoute
        ensureRoute(route).failed.push({
            url: meta.url || '',
            postData: meta.postData || null,
            errorText: params.errorText,
            canceled: params.canceled,
            type: params.type,
        })
    })

    on('Runtime.consoleAPICalled', (params) => {
        const text = (params.args || []).map((arg) => arg.value ?? arg.description ?? '').join(' ')
        ensureRoute(currentRoute).console.push({ type: params.type, text })
    })

    on('Runtime.exceptionThrown', (params) => {
        ensureRoute(currentRoute).exceptions.push(params.exceptionDetails?.text || 'exception')
    })

    await send('Page.enable')
    await send('Runtime.enable')
    await send('Network.enable')
    await send('Performance.enable')
    await send('DOM.enable')
    await send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 1200,
        deviceScaleFactor: 1,
        mobile: false,
    })

    async function navigate(route) {
        currentRoute = route
        ensureRoute(route)

        const loadPromise = new Promise((resolve) => {
            const handler = () => resolve()
            on('Page.loadEventFired', handler)
        })

        await send('Page.navigate', { url: `${BASE_URL}${route}` })
        await Promise.race([loadPromise, delay(15_000)])
        await delay(route === '/' ? 4_000 : 5_000)

        const perfResult = await send('Performance.getMetrics')
        const metrics = Object.fromEntries(perfResult.metrics.map((metric) => [metric.name, metric.value]))
        ensureRoute(route).metrics = {
            jsHeapUsedSize: metrics.JSHeapUsedSize || 0,
            domContentLoaded: metrics.DomContentLoaded || null,
            load: metrics.Load || null,
        }

        if (route === '/') {
            const youtubeIframeResult = await send('Runtime.evaluate', {
                expression: `(() => document.querySelectorAll('iframe[src*="youtube"], iframe[src*="youtu.be"]').length)()`,
                returnByValue: true,
            })

            ensureRoute(route).checks.youtubeIframes = youtubeIframeResult.result.value || 0
            ensureRoute(route).checks.youtubeRequests = ensureRoute(route).requests.filter((url) =>
                YOUTUBE_URL_PATTERNS.some((pattern) => pattern.test(url))
            ).length
        }

        if (route === '/vaults?tab=available') {
            const clickResult = await send('Runtime.evaluate', {
                expression: `(() => {
                    const candidates = [...document.querySelectorAll('button,[role="button"]')]
                    const target = candidates.find((element) => /connect/i.test(element.textContent || ''))
                    if (!target) return { found: false }
                    target.click()
                    return { found: true, text: (target.textContent || '').trim() }
                })()`,
                returnByValue: true,
            })

            await delay(2_500)

            const modalResult = await send('Runtime.evaluate', {
                expression: `(() => ({
                    dialogCount: document.querySelectorAll('[role="dialog"]').length,
                    bodyText: document.body.innerText,
                }))()`,
                returnByValue: true,
            })

            const modal = modalResult.result.value || {}
            ensureRoute(route).checks.connect = {
                found: Boolean(clickResult.result.value?.found),
                buttonText: clickResult.result.value?.text || '',
                dialogCount: modal.dialogCount || 0,
                hasWalletConnect: String(modal.bodyText || '').includes('WalletConnect'),
                hasRainbow: String(modal.bodyText || '').includes('Rainbow'),
            }
        }
    }

    for (const route of ROUTES) {
        await navigate(route)
    }

    const summary = ROUTES.map((route) => {
        const data = ensureRoute(route)
        const failed = stripIgnoredFailures(data.failed)
        const consoleEntries = stripIgnoredConsole(data.console)

        return {
            route,
            metrics: {
                jsHeapUsedSize: formatBytes(data.metrics.jsHeapUsedSize),
            },
            checks: data.checks,
            failed,
            console: consoleEntries,
            exceptions: data.exceptions,
        }
    })

    const failures = []

    for (const route of summary) {
        const errorConsole = route.console.filter((entry) => ['error', 'assert'].includes(entry.type))
        if (errorConsole.length) failures.push(`${route.route}: console errors detected`)
        if (route.exceptions.length) failures.push(`${route.route}: page exceptions detected`)
        if (route.failed.length) {
            const labels = route.failed.map((entry) => {
                let operationName = ''
                try {
                    operationName = JSON.parse(entry.postData || '{}').operationName || ''
                } catch {
                    operationName = ''
                }
                return operationName ? `${entry.url} (${operationName})` : entry.url
            })
            failures.push(`${route.route}: failed requests detected: ${labels.join(', ')}`)
        }
    }

    const homeRoute = summary.find((route) => route.route === '/')
    if (homeRoute?.checks.youtubeIframes !== 0) {
        failures.push(`/: expected 0 YouTube iframes before click, found ${homeRoute.checks.youtubeIframes}`)
    }
    if (homeRoute?.checks.youtubeRequests !== 0) {
        failures.push(`/: expected 0 YouTube requests before click, found ${homeRoute.checks.youtubeRequests}`)
    }

    const vaultsRoute = summary.find((route) => route.route === '/vaults?tab=available')
    if (!vaultsRoute?.checks.connect?.found) {
        failures.push('/vaults?tab=available: missing Connect button')
    }
    if ((vaultsRoute?.checks.connect?.dialogCount || 0) < 1) {
        failures.push('/vaults?tab=available: connect modal did not open')
    }
    if (!vaultsRoute?.checks.connect?.hasWalletConnect || !vaultsRoute?.checks.connect?.hasRainbow) {
        failures.push('/vaults?tab=available: connect modal missing expected wallet options')
    }

    console.log(JSON.stringify(summary, null, 2))

    ws.close()
    cleanup()

    if (failures.length) {
        console.error('\nSmoke failures:')
        failures.forEach((failure) => console.error(`- ${failure}`))
        process.exit(1)
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
