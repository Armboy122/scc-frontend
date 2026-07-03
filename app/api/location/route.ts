import { NextRequest, NextResponse } from 'next/server'

type NominatimResult = {
  display_name?: string
  lat?: string
  lon?: string
  name?: string
  address?: {
    road?: string
    suburb?: string
    quarter?: string
    neighbourhood?: string
    village?: string
    hamlet?: string
    town?: string
    city?: string
    municipality?: string
    district?: string
    county?: string
    state?: string
    country?: string
  }
}

function toLocationResult(item: NominatimResult) {
  const latitude = Number(item.lat)
  const longitude = Number(item.lon)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  const labelParts = [
    item.name,
    item.address?.road,
    item.address?.suburb,
    item.address?.quarter,
    item.address?.neighbourhood,
    item.address?.village,
    item.address?.hamlet,
    item.address?.town,
    item.address?.municipality,
    item.address?.city,
    item.address?.district,
    item.address?.county,
    item.address?.state,
  ].filter(Boolean)

  return {
    label: labelParts.length > 0 ? [...new Set(labelParts)].join(', ') : item.display_name || '',
    latitude,
    longitude,
  }
}

async function fetchNominatim(pathname: 'search' | 'reverse', searchParams: URLSearchParams) {
  const url = new URL(`https://nominatim.openstreetmap.org/${pathname}`)
  url.search = searchParams.toString()

  const response = await fetch(url, {
    headers: {
      'accept-language': 'th,en',
      'user-agent': 'SmartCoverConnect/1.0 (field work location lookup)',
    },
  })

  if (!response.ok) {
    throw new Error(`Nominatim request failed with status ${response.status}`)
  }

  return response.json()
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode')

  try {
    if (mode === 'search') {
      const query = searchParams.get('q')?.trim() ?? ''
      if (query.length < 3) {
        return NextResponse.json({ error: 'กรุณากรอกคำค้นหาอย่างน้อย 3 ตัวอักษร' }, { status: 400 })
      }

      const payload = (await fetchNominatim(
        'search',
        new URLSearchParams({
          format: 'jsonv2',
          q: query,
          limit: '5',
          addressdetails: '1',
          dedupe: '1',
          countrycodes: 'th',
          'accept-language': 'th,en',
        }),
      )) as NominatimResult[]

      return NextResponse.json({ results: payload.map(toLocationResult).filter(Boolean) })
    }

    if (mode === 'reverse') {
      const latitude = Number(searchParams.get('lat'))
      const longitude = Number(searchParams.get('lng'))

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return NextResponse.json({ error: 'ค่าพิกัดไม่ถูกต้อง' }, { status: 400 })
      }

      const payload = (await fetchNominatim(
        'reverse',
        new URLSearchParams({
          format: 'jsonv2',
          lat: String(latitude),
          lon: String(longitude),
          addressdetails: '1',
        }),
      )) as NominatimResult

      return NextResponse.json({ result: toLocationResult(payload) })
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  } catch (error) {
    console.error('Location API error:', error)
    return NextResponse.json({ error: 'ไม่สามารถค้นหาสถานที่ได้ในขณะนี้' }, { status: 502 })
  }
}
