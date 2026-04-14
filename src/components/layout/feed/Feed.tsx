import { useEffect, useState } from 'react'
import './Feed.css'
import type { WeatherResponse } from '../../../models/Weather'
import mainService from '../../../services/mainService'
import { CITIES, DEFAULT_CITY } from '../home/homeData'

export default function Feed() {
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [selectedCity, setSelectedCity] = useState(
    localStorage.getItem('selectedCity') || DEFAULT_CITY,
  )
  const [loading, setLoading] = useState(false)

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const city = event.target.value
    setSelectedCity(city)
    localStorage.setItem('selectedCity', city)
  }

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                setLoading(true)

                const data = await mainService.getWeather(selectedCity, 1) // ✅ only today
                setWeather(data)

            } catch (err) {
                console.error('Error fetching weather:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchWeather()
    }, [selectedCity])

    return (
        <div className="Feed">
  <div className="select-row">
            <label htmlFor='feed-city-select'>Location</label>
            <select id='feed-city-select' value={selectedCity} onChange={handleChange}>
                {CITIES.map(city => (
                    <option key={city} value={city}>
                        {city}
                    </option>
                ))}
            </select>
        </div>

            {loading && <p className='status-message'>Loading...</p>}

            {/* WEATHER */}
            {weather && !loading && (
                <div className="weather-card">
                    <h1> TODAY AT :</h1>
                    <h2>🌍 {weather.location.name}</h2>

                    <p>🌡️ Temperature: <b>{weather.current.temp_c}°C</b></p>

                    <p>🤔 Feels like: <b>{weather.current.feelslike_c}°C</b></p>

                    <p>☁️ Condition: <b>{weather.current.condition.text}</b></p>

                    <p>💧 Humidity: <b>{weather.current.humidity}%</b></p>

                    <p>🌬️ Wind: <b>{weather.current.wind_kph} km/h</b></p>

                    <p>🔆 UV Index: <b>{weather.current.uv}</b></p>

                    <p>
                        🌙 Day/Night:
                        <b>{weather.current.is_day ? " Day ☀️" : " Night 🌙"}</b>
                    </p>

                    <img
                        src={`https:${weather.current.condition.icon}`}
                        alt="weather icon"
                    />

                </div>
            )}

        </div>
    )
}