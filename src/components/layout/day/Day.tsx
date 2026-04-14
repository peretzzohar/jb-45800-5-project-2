import type { ForecastDay } from '../../../models/Weather'
import './Day.css'

interface DaysProps {
    day: ForecastDay,
}

export default function Day(data:DaysProps) {
const { day } = data


  return (
    <div className='Day'>
      <div className="day-card" key={day.date}>
                                <h4>{day.date}</h4>

                                <p className="temp">
                                    {day.day.maxtemp_c}° / {day.day.mintemp_c}°
                                </p>

                                <p className="desc">
                                    {day.day.condition.text}
                                </p>
                            </div>
    </div>
  )
}
