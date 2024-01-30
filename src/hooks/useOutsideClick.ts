import { useEffect } from 'react'

export function useOutsideClick(ref: HTMLElement | null | undefined, onOutsideClick: () => void) {
    useEffect(() => {
        if (!ref) return

        const onClick = (event: MouseEvent) => {
            if (ref !== event.target && !ref.contains(event.target as any)) {
                onOutsideClick()
            }
        }
        window.addEventListener('click', onClick)

        return () => {
            window.removeEventListener('click', onClick)
        }
    }, [ref, onOutsideClick])
}
