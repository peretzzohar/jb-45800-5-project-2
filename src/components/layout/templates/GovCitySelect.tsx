import { useEffect, useState } from 'react'
import govService from '../../../services/currencyService'
import Spinner from '../../common/spinner/Spinner'

interface GovCitySelectProps {
  value: string
  onChange: (value: string) => void
}

export default function GovCitySelect({ value, onChange }: GovCitySelectProps) {
  const [cities, setCities] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadCities = async () => {
      try {
        setLoading(true)
        setError('')

        const cityList = await govService.getCities(20)

        if (!isMounted) return

        setCities(cityList)

        if (!value && cityList.length > 0) {
          onChange(cityList[0])
        }
      } catch (err) {
        console.error(err)
        if (isMounted) {
          setError('Unable to load cities right now.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadCities()

    return () => {
      isMounted = false
    }
  }, [onChange, value])

  return (
    <section className='template-card'>
      <h2>API City Selector</h2>
      <p>Choose a city loaded from the government service.</p>

      {loading && <Spinner label='Loading cities...' />}
      {!loading && error && <p className='status-message error'>{error}</p>}

      {!loading && !error && (
        <>
          <div className='select-row'>
            <label htmlFor='gov-city-select'>City</label>
            <select
              id='gov-city-select'
              value={value}
              onChange={(event) => onChange(event.target.value)}
            >
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div className='selected-value'>Selected city: {value || 'None'}</div>
        </>
      )}
    </section>
  )
}
