import React, { SVGProps } from 'react'

const Caret = (props: Omit<SVGProps<SVGElement>, 'ref'>) => {
    return (
        <svg viewBox="0 0 12 20" width="12" height="20" {...props}>
            <path d="M 3,2 11,10 3,18"/>
        </svg>
    )
}

export default Caret