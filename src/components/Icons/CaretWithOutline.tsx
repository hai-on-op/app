import React, { SVGProps } from 'react'

const CaretWithOutline = (props: Omit<SVGProps<SVGElement>, 'ref'>) => {
    return (
        <svg viewBox="0 0 20 20" width="20" height="20" fill="black" stroke="black" strokeWidth="2" {...props}>
            <path d="M 4,8 10,14 16,8 14,6 10,10 6,6 Z"/>
        </svg>
    )
}

export default CaretWithOutline