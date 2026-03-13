export const MAX_RENDERED_LINE_POINTS = 180

export function downsampleSeriesPoints<T>(points: readonly T[], maxPoints = MAX_RENDERED_LINE_POINTS): T[] {
    if (points.length <= maxPoints) return [...points]
    if (maxPoints <= 2) return [points[0], points[points.length - 1]]

    const step = (points.length - 1) / (maxPoints - 1)
    const indices = new Set<number>()

    for (let index = 0; index < maxPoints; index += 1) {
        indices.add(Math.round(index * step))
    }

    indices.add(0)
    indices.add(points.length - 1)

    return [...indices]
        .sort((left, right) => left - right)
        .map((index) => points[index])
}
