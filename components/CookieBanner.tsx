import CookieConsent from 'react-cookie-consent'
import Link from 'next/link'
import styled from 'styled-components'

const CookieBanner = () => {
    return (
        <div id="cookies-consent">
            <CookieConsent
                location="bottom"
                buttonText="✓ Accept"
                cookieName="cookiesAccepted"
                style={{
                    background: '#191b1f',
                    boxShadow: '0 0 6px rgba(0,0,0,0.16)',
                }}
            >
                <CookiesText>
                    <img src={'/assets/cookie.svg'} alt="" />
                    {`This website uses cookies to enhance the user experience. By continuing to browse the site you're
                    agreeing to our`}
                    <CustomLink href="/privacy">use of cookies.</CustomLink>
                </CookiesText>
            </CookieConsent>
        </div>
    )
}

export default CookieBanner

const CookiesText = styled.span`
    color: ${(props) => props.theme.colors.primary};
    display: flex;
    align-items: center;
    flex-wrap: wrap;

    img {
        width: 20px;
        margin-right: 10px;
    }

    @media (max-width: 991px) {
        font-size: 14px;
    }
`

const CustomLink = styled(Link)`
    @media (min-width: 991px) {
        font-size: 16px;
        margin-left: 4px !important;
    }
    color: ${(props) => props.theme.colors.blueish};
    @media (max-width: 991px) {
        font-size: 14px;
    }
`
