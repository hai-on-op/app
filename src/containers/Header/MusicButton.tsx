import { useEffect, useState, type HTMLAttributes } from 'react'
import Youtube from 'react-youtube'

import { useStoreActions, useStoreState } from '~/store'

import styled from 'styled-components'
import { HaiButton } from '~/styles'
import { Sound } from '~/components/Icons/Sound'

export function MusicButton(props: HTMLAttributes<HTMLButtonElement>) {
    const {
        settingsModel: { isPlayingMusic },
    } = useStoreState((state) => state)
    const {
        settingsModel: { setIsPlayingMusic },
    } = useStoreActions((actions) => actions)

    const [player, setPlayer] = useState<any>()
    const [shouldRenderPlayer, setShouldRenderPlayer] = useState(isPlayingMusic)

    useEffect(() => {
        if (isPlayingMusic) {
            setShouldRenderPlayer(true)
        }
    }, [isPlayingMusic])

    useEffect(() => {
        if (!player) return

        if (isPlayingMusic) player.playVideo()
        else player.pauseVideo()
    }, [player, isPlayingMusic])

    return (
        <Container
            {...props}
            aria-label="Toggle Music"
            onClick={() => {
                if (!shouldRenderPlayer) {
                    setShouldRenderPlayer(true)
                    setIsPlayingMusic(true)
                    return
                }

                setIsPlayingMusic(!isPlayingMusic)
            }}
        >
            <Sound muted={!isPlayingMusic} size={21} />
            {shouldRenderPlayer && (
                <Youtube
                    videoId="1LoM8l8_1YM"
                    opts={{
                        width: '560',
                        height: '315',
                        title: 'GET $HAI ON YOUR OWN SUPPLY',
                        playerVars: {
                            autoplay: isPlayingMusic ? 1 : 0,
                            playsinline: 1,
                        },
                    }}
                    onReady={(event) => {
                        event.target.setLoop(true)
                        setPlayer(event.target)
                    }}
                    onPlay={() => {
                        setIsPlayingMusic(true)
                    }}
                    onPause={() => {
                        setIsPlayingMusic(false)
                    }}
                    onError={() => {
                        setPlayer(undefined)
                        setShouldRenderPlayer(false)
                        setIsPlayingMusic(false)
                    }}
                    onEnd={() => {
                        if (!player) return

                        player.seekTo(0, false)
                        player.playVideo()
                    }}
                />
            )}
        </Container>
    )
}

const Container = styled(HaiButton)`
    width: 48px;
    min-width: unset;
    height: 48px;
    padding: 0px;
    justify-content: center;
    flex-shrink: 0;

    & > *:nth-child(2) {
        position: absolute;
        & iframe {
            position: absolute;
            transform: translateY(85px);
            opacity: 0;
            pointer-events: none;
        }
    }
`
