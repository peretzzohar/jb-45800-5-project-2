export interface WeatherResponse {
    location: Location
    current: Current
    forecast: Forecast
}

/* ---------------- LOCATION ---------------- */

export interface Location {
    name: string
    // region: string
    country: string
}

/* ---------------- CURRENT WEATHER ---------------- */

export interface Current {
    feelslike_c: ReactNode
    humidity: ReactNode
    wind_kph: ReactNode
    uv: ReactNode
    is_day: any
    temp_c: number
    condition: Condition
}

/* ---------------- FORECAST ---------------- */

export interface Forecast {
    forecastday: ForecastDay[]
}

export interface ForecastDay {
    date: string
    day: Day
}

/* ---------------- DAY ---------------- */

export interface Day {
    maxtemp_c: number
    mintemp_c: number
    condition: Condition
}

/* ---------------- SHARED ---------------- */

export interface Condition {
    text: string
    icon: string
}