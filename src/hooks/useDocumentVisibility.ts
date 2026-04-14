import { useEffect, useState } from 'react'

export function useDocumentVisibility() {
    const [isDocumentVisible, setIsDocumentVisible] = useState(() =>
        typeof document === 'undefined' ? true : !document.hidden
    )

    useEffect(() => {
        const onVisibilityChange = () => {
            setIsDocumentVisible(!document.hidden)
        }

        document.addEventListener('visibilitychange', onVisibilityChange)
        return () => document.removeEventListener('visibilitychange', onVisibilityChange)
    }, [])

    return isDocumentVisible
}
