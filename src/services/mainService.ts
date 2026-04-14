import axios from 'axios'
import type { WeatherResponse } from '../models/Weather'

class MainService {

    async getWeather(city: string, day: number): Promise<WeatherResponse> {
        const { data } = await axios.get(
            'https://api.weatherapi.com/v1/forecast.json',
            {
                params: {
                    key: import.meta.env.VITE_API_KEY,
                    q: city,
                    days: day,
                }
            }
        )

        return data
    }
}

export default new MainService()