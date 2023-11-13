import React, { SVGProps } from 'react'

const HaiArrow = (props: Omit<SVGProps<SVGElement>, 'ref'>) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 20 20.000001" height="20" width="20" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" {...props}>
            <path d="m 10,2.25 v 15.5"/>
            <path d="m 3.35,10.75 6.65,7 6.65,-7"/>
        </svg>
    )
}

export default HaiArrow