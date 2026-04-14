import { useEffect, useState } from 'react'
import './Home.css'
import mainService from '../../../services/mainService'
import type { WeatherResponse } from '../../../models/Weather'
import Day from '../day/Day'
import { CITIES, DEFAULT_CITY, FORECAST_DAYS } from './homeData'

export default function Home() {
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [error, setError] = useState('')
  const [selectedCity, setSelectedCity] = useState(() => {
    return localStorage.getItem('selectedCity') || DEFAULT_CITY
  })
  const [selectedDay, setSelectedDay] = useState(7)
  const [loading, setLoading] = useState(false)

  function handleCityChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const city = event.target.value
    setSelectedCity(city)
    localStorage.setItem('selectedCity', city)
  }

  function handleDaysChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedDay(Number(event.target.value))
  }

  useEffect(() => {
    let isMounted = true

    const fetchWeather = async () => {
      if (!selectedCity) return

      try {
        setLoading(true)
        setError('')

        const data = await mainService.getWeather(selectedCity, selectedDay)

        if (isMounted) {
          setWeather(data)
        }
      } catch (err) {
        console.error(err)
        if (isMounted) {
          setError('Unable to load weather data right now.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchWeather()

    return () => {
      isMounted = false
    }
  }, [selectedCity, selectedDay])

  return (
    <div className='Body'>
      <div className='up'>
        <div className='select-row'>
          <label htmlFor='city-select'>Location</label>
          <select id='city-select' value={selectedCity} onChange={handleCityChange}>
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div className='select-row'>
          <label htmlFor='days-select'>Days</label>
          <select id='days-select' value={selectedDay} onChange={handleDaysChange}>
            {FORECAST_DAYS.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && error && <p>{error}</p>}

      {!loading && !error && weather && (
        <div className='down'>
          <div className='location-name'>
            <h2>{weather.location.name}</h2>
          </div>

          <div className='current-card'>
            <img
              src={`https:${weather.current.condition.icon}`}
              alt={weather.current.condition.text}
            />
            <h3>{weather.current.temp_c}°C</h3>
            <p>{weather.current.condition.text}</p>
          </div>

          <div className='forecast-grid'>
            {weather.forecast.forecastday.map((forecastDay) => (
              <Day key={forecastDay.date} day={forecastDay} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}