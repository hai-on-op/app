export function isAeroV2Route(pathname: string, search: string): boolean {
    const params = new URLSearchParams(search)
    const tab = params.get('tab')
    const collateral = params.get('collateral')
    const isMinterRoute =
        pathname === '/haiAERO' ||
        pathname === '/haiVELO' ||
        (pathname.startsWith('/vaults') &&
            (tab === 'aero-v2' || ['HAIVELO', 'HAIVELOV2', 'HAIAERO'].includes(collateral || '')))

    return (
        isMinterRoute &&
        (tab === 'aero-v2' ||
            (pathname === '/haiAERO' && !['legacy-mint', 'legacy-bridge', 'manage', 'activity'].includes(tab || '')))
    )
}
