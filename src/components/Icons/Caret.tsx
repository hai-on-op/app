import React, { SVGProps } from 'react'

const Caret = (props: Omit<SVGProps<SVGElement>, 'ref'>) => {
    return (
        <svg viewBox="0 0 14 20" width="14" height="20" fill="none" stroke="black" strokeWidth="2" {...props}>
            <polyline points="4,2 12,10 4,18"/>
        </svg>
    )
}

export default Caret