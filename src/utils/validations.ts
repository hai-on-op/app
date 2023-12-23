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

export const stringsExistAndAreEqual = (a: string, b: string) => {
    return !!a && !!b && a.toLowerCase() === b.toLowerCase()
}
