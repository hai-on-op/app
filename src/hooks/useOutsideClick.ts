import { useEffect, type RefObject } from 'react'

export function useOutsideClick(
    ref: RefObject<HTMLElement> | HTMLElement | null | undefined,
    onOutsideClick: () => void
) {
    useEffect(() => {
        const element = ref && 'current' in ref ? ref.current : ref
        if (!element) return

        const onClick = (event: MouseEvent) => {
            if (element !== event.target && !element.contains(event.target as any)) {
                onOutsideClick()
            }
        }
        window.addEventListener('click', onClick)

        return () => {
            window.removeEventListener('click', onClick)
        }
    }, [ref, onOutsideClick])
}
