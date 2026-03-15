type AbiInput = {
    type?: string
}

type AbiEntry = {
    type?: string
    name?: string
    inputs?: AbiInput[]
}

type AbiFactory = {
    abi?: AbiEntry[]
}

export function removeDuplicateNamedEvents(abi: AbiEntry[], eventName: string): AbiEntry[] {
    let matchedEventCount = 0
    let lastMatchingIndex = -1

    abi.forEach((entry, index) => {
        if (entry.type === 'event' && entry.name === eventName) {
            matchedEventCount += 1
            lastMatchingIndex = index
        }
    })

    if (matchedEventCount <= 1) {
        return abi
    }

    return abi.filter(
        (entry, index) => !(entry.type === 'event' && entry.name === eventName && index !== lastMatchingIndex)
    )
}

export function sanitizeFactoryDuplicateNamedEvents(factory: AbiFactory, eventName: string) {
    if (!factory.abi?.length) return

    const sanitizedAbi = removeDuplicateNamedEvents(factory.abi, eventName)
    if (sanitizedAbi === factory.abi) return

    factory.abi.splice(0, factory.abi.length, ...sanitizedAbi)
}
