import { type CSSProperties, type Dispatch, type ReactNode, type SetStateAction, type SVGProps } from 'react'

import { ActionState } from '~/utils'

export type ReactChildren = JSX.Element | ReactNode | ReactNode[]

export type SetState<T> = Dispatch<SetStateAction<T>>

export type IconProps = Omit<SVGProps<SVGElement>, 'ref'> & {
    size?: number
}

export type DirectionalIconProps = IconProps & {
    direction?: 'up' | 'down' | 'left' | 'right' | 'upRight' | 'upLeft' | 'downRight' | 'downLeft'
}

export type SplashImage = {
    index: number
    width: string
    style?: CSSProperties
    rotation?: number
    flip?: boolean
    zIndex?: number
}

// TABLES

export type SortableHeader = {
    label: string
    tooltip?: ReactChildren
    tooltipAnchor?: 'top' | 'bottom'
    unsortable?: boolean
}

export type Sorting = {
    key: string
    dir: 'asc' | 'desc'
}

export type TableHeaderProps = {
    headers: SortableHeader[]
    sorting: Sorting
    onSort: (label: string) => void
}

export type LangOption = {
    name: string
    code: string
}

export type NavLinkType = {
    type: string
    text: string
}

export type IAlert = {
    type: string
    text: string
}

export type LoadingPayload = {
    isOpen: boolean
    text: string
}

export type IWaitingPayload = {
    title?: string
    text?: string
    hint?: string
    status: ActionState
    hash?: string
    isCreate?: boolean
}

export type IOperation = {
    isOpen: boolean
    type: string
}

export type IAuctionOperation = IOperation & {
    auctionType: string
}
