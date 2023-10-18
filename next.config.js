/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
	swcMinify: true,
	compiler: {
		styledComponents: true
	},
	images: {
		domains: [
			'localhost'
		],
	},
    distDir: 'build'
}

module.exports = nextConfig
