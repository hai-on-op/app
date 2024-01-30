import { useCallback, useEffect, useState } from 'react'

import { useStoreActions } from '~/store'

export function usePlaylist(songs: string[], volume = 1) {
    const { settingsModel: settingsModelActions } = useStoreActions((actions) => actions)

    const [audio] = useState<HTMLAudioElement>(() => new Audio())
    const [index, setIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const play = useCallback(() => {
        audio
            ?.play()
            .then(() => {
                setIsPlaying(true)
            })
            .catch(() => {
                setIsPlaying(false)
                settingsModelActions.setIsPlayingMusic(false)
                console.warn('failed to play audio')
            })
    }, [audio])

    const pause = useCallback(() => {
        audio?.pause()
        setIsPlaying(false)
    }, [audio])

    const next = useCallback(() => {
        setIndex((i) => (i + 1) % songs.length)
        setIsLoading(true)
    }, [songs])

    const previous = useCallback(() => {
        setIndex((i) => (i === 0 ? songs.length - 1 : i - 1))
        setIsLoading(true)
    }, [songs])

    useEffect(() => {
        // console.log('create playlist')

        return () => {
            // console.log('clean up playlist')
            audio?.pause()
        }
    }, [audio])

    useEffect(() => {
        // console.log(`song change to index ${index}`)

        if (!songs.length || !audio) return

        audio.src = songs[index]
        audio.loop = false
        audio.load()
        setIsLoading(true)
    }, [audio, songs, index])

    useEffect(() => {
        if (!audio) return

        audio.volume = volume || 1
    }, [audio, volume])

    useEffect(() => {
        const handleLoadedData = () => {
            setIsLoading(false)
            isPlaying && play()
        }

        audio?.addEventListener('loadeddata', handleLoadedData)

        return () => audio?.removeEventListener('loadeddata', handleLoadedData)
    }, [audio, isPlaying, play])

    useEffect(() => {
        const handleEnded = () => {
            next()
        }

        audio?.addEventListener('ended', handleEnded)

        return () => audio?.removeEventListener('ended', handleEnded)
    }, [audio, next])

    return {
        play,
        pause,
        next,
        previous,
        playingIndex: index,
        isLoading,
        isPlaying,
    }
}
