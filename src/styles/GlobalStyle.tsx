import { createGlobalStyle } from 'styled-components'

interface Props {
    bodyOverflow?: boolean
}

export const GlobalStyle = createGlobalStyle`
    :root {
        /* --hai-orange: rgb(255, 157, 10); */
        --hai-orange: #ff9d0a;
        /* --hai-skyblue: rgb(95, 212, 242); */
        --hai-skyblue: #5fd4f2;
    }

    /* body::-webkit-scrollbar {
        width: 10px;
        background: transparent;
    }

    body::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 4px;
    }

    body::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.2);
        box-shadow: 0 0 2px 1px rgba(0, 0, 0, 0.2);
    }

    body::-webkit-scrollbar-thumb:active {
        background-color: rgba(0, 0, 0, 0.2);
    } */

    body {
        margin: 0;
        font-family: Inter, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        color: ${(props) => props.theme.colors.primary};
        background-color:${(props) => props.theme.colors.background};
        overflow: ${(props: Props) => (props.bodyOverflow ? 'hidden' : 'visible')};
        line-height: 1.4;

        .web3modal-modal-lightbox {
            z-index: 999;

            .web3modal-modal-card {
                display: block;
                max-width: 400px;
                .web3modal-provider-container {
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;

                    .web3modal-provider-name {
                        font-size: 16px;
                        width: auto;
                    }

                    .web3modal-provider-icon {
                        order: 2;
                        width: 30px;
                        height: 30px;
                    }
                    .web3modal-provider-description {
                        display: none;
                    }
                }
        
            }
        }
        .place-left {
            &:after{
                border-left-color:${(props) => props.theme.colors.foreground} !important
            }
        }

        .place-top {
            &:after{
                border-top-color:${(props) => props.theme.colors.foreground} !important
            }
        }
        .place-bottom {
            &:after{
                border-bottom-color:${(props) => props.theme.colors.foreground} !important
            }
        }
        .place-right {
            &:after{
                border-right-color:${(props) => props.theme.colors.foreground} !important
            }
        }
        .__react_component_tooltip {
            max-width: 250px;
            padding-top: 20px;
            padding-bottom: 20px;
            border-radius: 5px;
            color:${(props) => props.theme.colors.primary};
            opacity: 1 !important;
            background: ${(props) => props.theme.colors.foreground};
            border: ${(props) => props.theme.colors.border} !important;
            box-shadow: 0 0 6px rgba(0, 0, 0, 0.16);
        
        }
    }

    body, html {
        scroll-snap-type: y mandatory;
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
    }

    * {
        box-sizing: border-box;
    }

    a {
        text-decoration: none;
        color: #b1aef9;
    }

    h1, h2, h3, h4, h5, h6 {
        margin: 0;
        line-height: 1;
    }

    /* Helpers */

    .text-left {
        text-align: left;
    }

    .text-right {
        text-align: right;
    }

    .text-center {
        text-align: center;
    }

    .text-uppercase {
        text-transform: uppercase;
    }

    .text-capitalize {
        text-transform: capitalize;
    }

    .text-strike {
        text-decoration: line-through;
    }

    .Toastify__toast-container--top-right {
        top: 6rem !important;
    }
`
