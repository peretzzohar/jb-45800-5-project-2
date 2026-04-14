import axios from 'axios'

export interface GovCityRecord {
  city_code: number
  city_name_he: string
  city_name_en: string
  region_name?: string
}

interface GovCitiesApiRecord {
  city_code: number | string
  city_name_he?: string | null
  city_name_en?: string | null
  region_name?: string | null
}

interface GovCitiesResponse {
  result?: {
    records?: GovCitiesApiRecord[]
  }
}

class GovService {
  async getCityRecords(limit = 20): Promise<GovCityRecord[]> {
    const { data } = await axios.get<GovCitiesResponse>(import.meta.env.VITE_GOV_API_URL, {
      params: {
        limit,
      },
    })

    const records = data.result?.records ?? []

    return records
      .map((record) => ({
        city_code: Number(record.city_code) || 0,
        city_name_he: record.city_name_he?.trim() ?? '',
        city_name_en: record.city_name_en?.trim() || record.city_name_he?.trim() || '',
        region_name: record.region_name?.trim() ?? '',
      }))
      .filter((record) => record.city_code !== 0 && Boolean(record.city_name_en || record.city_name_he))
  }

  async getCities(limit = 20): Promise<string[]> {
    const records = await this.getCityRecords(limit)

    return Array.from(new Set(records.map((record) => record.city_name_en || record.city_name_he)))
  }
}

export default new GovService()