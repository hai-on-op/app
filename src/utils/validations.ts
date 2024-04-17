import { getAddress } from 'viem'

export const isValidEmail = (email: string) => {
    const re =
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(email.toLowerCase())
}

export const isNumeric = (val: string) => {
    return !isNaN(+val) && !isNaN(parseFloat(val))
}

export const isAddress = (value: any): boolean => {
    try {
        return !!getAddress(value)
    } catch {
        return false
    }
}

export function isFormattedAddress(value: any): string | false {
    try {
        return getAddress(value)
    } catch {
        return false
    }
}

export const stringsExistAndAreEqual = (a: string | null | undefined, b: string | null | undefined) => {
    return !!a && !!b && a.toLowerCase() === b.toLowerCase()
}

export const stringExistsAndMatchesOne = (s: string | null | undefined, arr: (string | null | undefined)[]) => {
    if (!s) return false
    for (const compareTo of arr) {
        if (s.toLowerCase() === compareTo?.toLowerCase()) return true
    }
    return false
}
