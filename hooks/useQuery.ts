import { useRouter } from 'next/router'

export function useQuery() {
    const router = useRouter()

    return router.query
}
