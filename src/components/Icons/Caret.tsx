import React, { SVGProps } from 'react'

const Caret = (props: Omit<SVGProps<SVGElement>, 'ref'>) => {
    return (
        <svg viewBox="0 0 12 20" width="12" height="20" fill="none" stroke="black" strokeWidth="2" {...props}>
            <polyline points="3,2 11,10 3,18"/>
        </svg>
    )
}

export default Caret