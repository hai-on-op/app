import { TOKEN_LOGOS } from "~/utils"

import { type SplashImage } from "./ZoomScene"
import { Cloud } from "~/components/Cloud"
import { Elf } from "~/components/Elf"
import { HaiCoin } from "~/components/HaiCoin"

export type FloatingElementsProps = {
    elves?: SplashImage[],
    clouds?: SplashImage[],
    coins?: (Omit<SplashImage, 'index'> & {
        index: number | keyof typeof TOKEN_LOGOS,
        thickness?: number
    })[]
}
export function FloatingElements({ elves, clouds, coins }: FloatingElementsProps) {
    return (<>
        {(elves || []).map(({ index, width, style, rotation = 0, flip, zIndex = 0 }, i) => (
            <Elf
                key={i}
                variant={index}
                width={width}
                animated
                style={{
                    ...style,
                    transform: `translateZ(${zIndex * 20}px) rotate(${rotation}deg)${flip ? ' scaleX(-1)': ''}`,
                    zIndex
                }}
            />
        ))}
        {(clouds || []).map(({ index, width, style, rotation = 0, flip, zIndex = 0 }, i) => (
            <Cloud
                key={i}
                variant={index}
                width={width}
                style={{
                    ...style,
                    transform: `translateZ(${zIndex * 20}px) rotate(${rotation}deg)${flip ? ' scaleX(-1)': ''}`,
                    zIndex
                }}
            />
        ))}
        {(coins || []).map(({ index, width, style, rotation = 0, zIndex = 0, thickness }, i) => (
            <HaiCoin
                key={i}
                variant={typeof index === 'string'
                    ? index
                    : index === 0
                        ? 'HAI'
                        : 'KITE'
                }
                width={width}
                animated
                style={{
                    ...style,
                    transform: `translateZ(${zIndex * 20}px) rotate(${rotation}deg)`,
                    zIndex
                }}
                thickness={thickness}
            />
        ))}
    </>)
}