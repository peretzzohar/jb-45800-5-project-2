import { useState } from 'react'
import './Templates.css'
import GovCitiesGrid from './GovCitiesGrid'
import GovCitySelect from './GovCitySelect'
import NumberSelect from './NumberSelect'

export default function Templates() {
  const [selectedNumber, setSelectedNumber] = useState(1)
  const [selectedCity, setSelectedCity] = useState('')

  return (
    <div className='Templates'>
      <NumberSelect value={selectedNumber} onChange={setSelectedNumber} />
      <GovCitySelect value={selectedCity} onChange={setSelectedCity} />
      <GovCitiesGrid />
    </div>
  )
}