import { useEffect, useRef } from 'react'

import styled, { css } from 'styled-components'

export function Privacy({ ...props }) {
    const privacyRef = useRef<HTMLElement>(null)

    useEffect(() => {
        setTimeout(() => {
            if (props.location?.state?.goToCookies && privacyRef.current) {
                privacyRef.current.scrollIntoView({ behavior: 'smooth' })
            }
            else {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth',
                })
            }
        }, 500)
    }, [props.location])

    return (
        <div>
            <InnterContent>
                <Title>{/* Title */}</Title>
                <Date>{/* Date */}</Date>
                <p>{/* Content */}</p>
            </InnterContent>
        </div>
    )
}

const ExternalLinkArrow = css`
    border: 0;
    cursor: pointer;
    box-shadow: none;
    outline: none;
    padding: 0;
    margin: 0;
    color: ${({ theme }) => theme.colors.blueish};
    font-size: ${({ theme }) => theme.font.small};
    font-weight: 600;
    line-height: 24px;
    letter-spacing: -0.18px;
    &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
        &:hover {
            opacity: 0.5;
        }
    }
    transition: all 0.3s ease;
    &:hover {
        opacity: 0.8;
    }
    img {
        position: relative;
        top: 1px;
    }
`

const Title = styled.h1`
    font-weight: 600;
    text-align: center;
    max-width: 450px;
    margin: 0 auto 60px auto;
    font-size: 50px;
    color: ${({ theme }) => theme.colors.primary};
    ${({ theme }) => theme.mediaWidth.upToSmall`
        font-size:35px;
    `}
`

const InnterContent = styled.div`
    max-width: 1024px;
    margin: 0 auto 80px auto;
    padding-top: 100px;
    padding-right: 20px;
    padding-left: 20px;

    p {
        line-height: 1.8 !important;
        margin-bottom: 0 !important;
        > strong {
            font-size: calc(0.51vw + 0.51vh + 0.5vmin);
            line-height: 2;
            font-weight: 600;
            margin: 0;
            color: ${({ theme }) => theme.colors.primary};
            a {
                ${ExternalLinkArrow}
                display: inline;
                font-size: calc(0.44vw + 0.44vh + 0.5vmin);
                word-break: break-all;
            }
            ${({ theme }) => theme.mediaWidth.upToSmall`
                font-size: 16px;
                a {
                    font-size: 16px;
                }
            `}
        }
    }
    
    p, li {
        color: ${({ theme }) => theme.colors.secondary};
        font-weight: 600;
        font-size: calc(0.46vw + 0.46vh + 0.5vmin);
        ${({ theme }) => theme.mediaWidth.upToSmall`
            font-size:15px;
        `}
        a {
            ${ExternalLinkArrow}
            display: inline;
            font-size: calc(0.44vw + 0.44vh + 0.5vmin);
            word-break: break-all;
            ${({ theme }) => theme.mediaWidth.upToSmall`
                font-size: 15px;
            `}
        }
    }

    h3 {
        font-size: calc(0.8vw + 0.8vh + 0.5vmin);
        font-weight: 600;
        color: ${({ theme }) => theme.colors.primary};
        margin-top: 60px;
        margin-bottom: 20px;
        ${({ theme }) => theme.mediaWidth.upToSmall`
            font-size:20px;
            margin-bottom:20px;
        `}
    }

    h5 {
        font-size: calc(0.6vw + 0.6vh + 0.5vmin);
        line-height: 2;
        margin: 20px 0 0 0;
        color: ${({ theme }) => theme.colors.primary};
        font-weight: 600;
        a {
            ${ExternalLinkArrow}
            display: inline;
            font-size: calc(0.44vw + 0.44vh + 0.5vmin);
            word-break: break-all;
        }
        ${({ theme }) => theme.mediaWidth.upToSmall`
            font-size: 17px;
            a {
                font-size: 17px;
            }
        `}
    }

    h6 {
        font-size: calc(0.53vw + 0.53vh + 0.5vmin);
        line-height: 2;
        margin: 0;

        a {
            ${ExternalLinkArrow}
            display: inline;
            font-size: calc(0.48vw + 0.48vh + 0.5vmin);
            word-break: break-all;
        }
        ${({ theme }) => theme.mediaWidth.upToSmall`
            font-size: 16px;
            a {
                font-size: 16px;
            }
        `}
    }
`

const Date = styled.div`
    color: ${({ theme }) => theme.colors.secondary};
    text-align: center;
    margin: 30px 0 80px 0;
    font-weight: bold;
`
