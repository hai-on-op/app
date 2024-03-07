import { useState } from 'react'
import Youtube from 'react-youtube'

import { useStoreActions, useStoreState } from '~/store'

import styled from 'styled-components'
import { HaiButton } from '~/styles'
import { Sound } from '~/components/Icons/Sound'

export function MusicButton() {
    const {
        settingsModel: { isPlayingMusic },
    } = useStoreState((state) => state)
    const {
        settingsModel: { setIsPlayingMusic },
    } = useStoreActions((actions) => actions)

    const [player, setPlayer] = useState<any>()

    return (
        <Container
            aria-label="Toggle Music"
            onClick={() => {
                if (!player) return

                if (isPlayingMusic) player.pauseVideo()
                else player.playVideo()
            }}
        >
            <Sound muted={!isPlayingMusic} size={21} />
            <Youtube
                videoId="1LoM8l8_1YM"
                opts={{
                    width: '560',
                    height: '315',
                    title: 'GET $HAI ON YOUR OWN SUPPLY',
                    ...(isPlayingMusic && {
                        playerVars: {
                            autoplay: 1,
                        },
                    }),
                }}
                onReady={(event) => {
                    event.target.setLoop(true)
                    setPlayer(event.target)
                }}
                onPlay={() => {
                    // console.log('play')
                    setIsPlayingMusic(true)
                }}
                onPause={() => {
                    // console.log('pause')
                    setIsPlayingMusic(false)
                }}
                onError={() => {
                    // console.error(e)
                    setIsPlayingMusic(false)
                }}
                onEnd={() => {
                    if (!player) return

                    player.seekTo(0, false)
                    player.playVideo()
                }}
            />
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
