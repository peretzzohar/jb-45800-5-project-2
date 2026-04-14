import { useEffect, useState } from 'react'
import './Home.css'
import mainService from '../../../services/mainService'
import type { WeatherResponse } from '../../../models/Weather'
import Day from '../day/Day'

const cities = [
  "Tel Aviv, Israel",
  "Paris, France",
  "London, United Kingdom",
  "Berlin, Germany",
  "Rome, Italy",
  "Madrid, Spain",
  "Lisbon, Portugal",
  "Athens, Greece",
  "Cairo, Egypt",
  "Dubai, United Arab Emirates",
  "New York, USA",
  "Toronto, Canada",
  "Mexico City, Mexico",
  "Rio de Janeiro, Brazil",
  "Buenos Aires, Argentina",
  "Cape Town, South Africa",
  "Nairobi, Kenya",
  "Tokyo, Japan",
  "Seoul, South Korea",
  "Sydney, Australia"
]

const days = [1, 2, 3, 4, 5, 6, 7]

export default function Body() {
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [selectedCity, setSelectedCity] = useState(
    localStorage.getItem('selectedCity') || 'Tel Aviv, Israel'
  )
  const [selectedDay, setSelectedDay] = useState(7)
  const [loading, setLoading] = useState(false)

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const city = event.target.value
    setSelectedCity(city)
    localStorage.setItem('selectedCity', city)
  }

  function handleChangeDays(event: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedDay(Number(event.target.value))
  }

  useEffect(() => {
    if (!selectedCity) return

    const fetchWeather = async () => {
      try {
        setLoading(true)

        const data = await mainService.getWeather(
          selectedCity,
          selectedDay
        )

        setWeather(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
  }, [selectedCity, selectedDay])

  return (
    <div className='Body'>

      <div className='up'>

        <div className="select-row">
          <h3>Location</h3>
          <select value={selectedCity} onChange={handleChange}>
            {cities.map(city => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div className="select-row">
          <h3>Days:</h3>
          <select value={selectedDay} onChange={handleChangeDays}>
            {days.map(day => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* LOADING */}
      {loading && <p>Loading...</p>}

      {/* WEATHER */}
      {!loading && weather && (
        <div className='down'>

          <div className='location-name'>
            <h2>{weather.location.name}</h2>
          </div>

          {/* CURRENT */}
          <div className="current-card">
            <img src={`https:${weather.current.condition.icon}`} />
            <h3>{weather.current.temp_c}°C</h3>
            <p>{weather.current.condition.text}</p>
          </div>

          {/* FORECAST */}
          <div className="forecast-grid">
            {weather.forecast.forecastday.map((day) => (
              <Day key={day.date} day={day} />
            ))}
          </div>

        </div>
      )}

    </div>
  )
}