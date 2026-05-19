import { useState, useEffect, useCallback } from 'react'
import { CONFIG } from '../config/config'
import { apiGet, apiPost } from '../utils/api'

const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function configMealsToArray() {
  return DAY_ORDER.map(day => ({
    day,
    main:  CONFIG.meals?.[day]?.main  ?? '',
    note:  CONFIG.meals?.[day]?.note  ?? '',
    lunch: CONFIG.meals?.[day]?.lunch ?? '',
  }))
}

export function useMeals() {
  const [meals,  setMeals]  = useState(configMealsToArray)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    apiGet('/meals').then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setMeals(data)
      } else {
        // Seed DB from config on first run
        const defaults = configMealsToArray()
        defaults.forEach(({ day, main, note, lunch }) =>
          apiPost(`/meals/${day}`, { main, note, lunch })
        )
      }
      setLoaded(true)
    })
  }, [])

  const updateMeal = useCallback((day, main, note, lunch = '') => {
    setMeals(prev => prev.map(m => m.day === day ? { day, main, note, lunch } : m))
    apiPost(`/meals/${day}`, { main, note, lunch })
  }, [])

  const getMealForDay = useCallback((dayName) => {
    return meals.find(m => m.day === dayName) ?? { day: dayName, main: '', note: '', lunch: '' }
  }, [meals])

  return { meals, updateMeal, getMealForDay, DAY_ORDER, loaded }
}
