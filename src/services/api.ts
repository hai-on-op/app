import axios from 'axios'

export const fetchFiatPrice = async (token: string = 'ethereum') => {
    try {
        const res = await axios.get(
            `https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=usd&include_24hr_change=true`
        )
        return res.data[token]
    } catch (error) {
        console.log(error)
    }
}
