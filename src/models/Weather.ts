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
    feelslike_c: number
    humidity: number
    wind_kph: number
    uv: number
    is_day: number
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