import { useEffect, useRef, useState } from 'react'
import { MEDIA_WIDTHS } from '~/utils'

export function useMediaQuery(query: keyof typeof MEDIA_WIDTHS | string) {
    const [ matches, setMatches ] = useState(false)
    const matchesRef = useRef(matches)
    matchesRef.current = matches

    useEffect(() => {
        const media = window.matchMedia(
            // eslint-disable-next-line no-prototype-builtins
            MEDIA_WIDTHS.hasOwnProperty(query)
                ? `(min-width: ${MEDIA_WIDTHS[query as keyof typeof MEDIA_WIDTHS]}px)`
                : query
        )

        const onChange = () => {
            if (media.matches !== matchesRef.current) {
                setMatches(media.matches)
            }
        }
        onChange()
        media.addEventListener('change', onChange)

        return () => media.removeEventListener('change', onChange)
    }, [ query ])

    return matches
}
