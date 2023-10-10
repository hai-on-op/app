import Document, { DocumentContext, DocumentInitialProps, Head, Html, Main, NextScript } from 'next/document'
import { ServerStyleSheet } from 'styled-components'

export default class MyDocument extends Document {
    static async getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps> {
        const sheet = new ServerStyleSheet()
        const originalRenderPage = ctx.renderPage

        try {
            ctx.renderPage = () =>
                originalRenderPage({
                    enhanceApp: (App) => (props) => sheet.collectStyles(<App {...props} />),
                })
            const initialProps = await Document.getInitialProps(ctx)
            return {
                ...initialProps,
                styles: (
                    <>
                        {initialProps.styles}
                        {sheet.getStyleElement()}
                    </>
                ),
            }
        } finally {
            sheet.seal()
        }
    }

    render() {
        return (
            <Html>
                <Head>
                    <meta name="application-name" content="Hai App" />
                    <meta name="apple-mobile-web-app-capable" content="yes" />
                    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                    <meta name="apple-mobile-web-app-title" content="Hai App" />
                    <meta name="description" content="Let's get HAI" />
                    <meta name="format-detection" content="telephone=no" />
                    <meta name="mobile-web-app-capable" content="yes" />
                    <meta name="msapplication-config" content="/browserconfig.xml" />
                    <meta name="msapplication-TileColor" content="#FFFFFF" />
                    <meta name="msapplication-tap-highlight" content="no" />
                    <meta name="theme-color" content="#000000" />

                    <link rel="apple-touch-icon" href="/logo192.png" />

                    <link rel="icon" type="image/png" sizes="192x192" href="/logo192.png" />
                    <link rel="manifest" href="/manifest.json" />
                    <link rel="mask-icon" href="/logo192.png" color="#ffffff" />
                    <link rel="shortcut icon" href="/logo192.png" />

                    <meta name="twitter:card" content="summary" />
                    <meta name="twitter:url" content="https://letsgethai.com" />
                    <meta name="twitter:title" content="Hai" />
                    <meta name="twitter:description" content="Let's get HAI" />
                    <meta name="twitter:image" content="https://letsgethai.com/logo192.png" />
                    <meta name="twitter:creator" content="@letsgethai" />
                    <meta property="og:type" content="website" />
                    <meta property="og:title" content="Hai App" />
                    <meta property="og:description" content="Let's get HAI" />
                    <meta property="og:site_name" content="Hai App" />
                    <meta property="og:url" content="https://letsgethai.com" />
                    <meta property="og:image" content="https://letsgethai.com/logo192.png" />

                    {!!process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID && (
                        <>
                            <script
                                async
                                src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}`}
                            />
                            <script>{`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}');
                        `}</script>
                        </>
                    )}
                </Head>
                <body>
                    <Main />
                    <NextScript />
                </body>
            </Html>
        )
    }
}
