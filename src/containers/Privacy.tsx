import { useEffect, useRef } from 'react'
import styled from 'styled-components'

// Components
import GridContainer from '~/components/GridContainer'

// Utils
import _ from '~/utils/lodash'

// Styles
import { ExternalLinkArrow } from '~/styles'

const Privacy = ({ ...props }) => {
    const privacyRef = useRef(null)

    useEffect(() => {
        setTimeout(() => {
            if (_.get(props.location, 'state.goToCookies', false) && privacyRef.current) {
                // @ts-ignore
                privacyRef.current.scrollIntoView({ behavior: 'smooth' })
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' })
            }
        }, 500)
        // eslint-disable-next-line
    }, [])

    return (
        <GridContainer>
            <InnterContent>
                <Title>{/* Title */}</Title>
                <Date>{/* Date */}</Date>
                <p>{/* Content */}</p>
            </InnterContent>
        </GridContainer>
    )
}

export default Privacy

const Title = styled.h1`
    font-weight: 600;
    text-align: center;
    max-width: 450px;
    margin: 0 auto 60px auto;
    font-size: 50px;
    color: ${(props) => props.theme.colors.primary};
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
            color: ${(props) => props.theme.colors.primary};
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
        color: ${(props) => props.theme.colors.secondary};
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
        color: ${(props) => props.theme.colors.primary};
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
        color: ${(props) => props.theme.colors.primary};
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
    color: ${(props) => props.theme.colors.secondary};
    text-align: center;
    margin: 30px 0 80px 0;
    font-weight: bold;
`
