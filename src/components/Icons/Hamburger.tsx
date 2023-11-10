import React, { type SVGProps } from 'react'

const Hamburger = (props: Omit<SVGProps<SVGElement>, 'ref'>) => {
    return (
        <svg viewBox="0 0 10 8" width="10" height="8" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" {...props}>
            <line x1="1" y1="1" x2="9" y2="1"/>
            <line x1="1" y1="4" x2="9" y2="4"/>
            <line x1="1" y1="7" x2="9" y2="7"/>
        </svg>
    )
}

export default Hamburger