import { IntentsMap, IntentsService } from "../intents/intents-service.ts"
import { Subscribable, Collection, RxDb, Notifiable, OnChange, mergeNotifications } from "../preact/reactive.ts"

const KEY = 'trust-ai-categories'

type CategorySchema = Record<string, string[]>

// TODO persist to backend
export class CategoryService implements Notifiable {
  [OnChange]: Subscribable
  #col: Collection<CategorySchema>
  #intentsService: IntentsService

  constructor(
    db: RxDb,
    intentsService: IntentsService
  ) {
    this.#col = db.createCollection('categories', {})
    this[OnChange] = mergeNotifications(this.#col, intentsService[OnChange])
    this.#intentsService = intentsService
  }

  #persist() {
    window.localStorage.setItem(KEY, JSON.stringify(this.#col.get()))
  }

  loadCategories() {
    return this.#col.update(async (categories) => {
      const stored = window.localStorage.getItem(KEY)
      if (!stored) {
        // Add some demo categories if nothing is set
        await this.#intentsService.fetchIntents()
        const intents = Array.from(this.#intentsService.getIntents().keys())
        Object.assign(categories, {
          "Example Category": [intents[0], intents[1], intents[2]]
        })
        return
      }
      Object.assign(categories, JSON.parse(stored))
    })
  }

  newCategory(categoryName: string) {
    this.#col.update((categories) => {
      categories[categoryName] = []
      this.#persist()
    })
  }

  removeCategory(categoryName: string) {
    this.#col.update((categories) => {
      delete categories[categoryName]
      this.#persist()
    })
  }

  addIntent(categoryName: string, intent: string) {
    this.#col.update((categories) => {
      categories[categoryName] = categories[categoryName] || []
      categories[categoryName].push(intent)
      this.#persist()
    })
  }

  removeIntent(categoryName: string, intent: string) {
    this.#col.update((categories) => {
      categories[categoryName] = categories[categoryName] || []
      categories[categoryName] = categories[categoryName].filter(n => n !== intent)
      this.#persist()
    })
  }

  getCategorySummary(): Map<string, number> {
    const intentList: Array<[string, number]> = []
    
    for (const category in this.#col.get()) {
      const intents = this.getIntentsFor(category) || new Map()
      const sum = Array.from(intents.values()).reduce((p, c) => p + c, 0)
      intentList.push([category, sum])
    }

    intentList.sort((a, b) => b[1] - a[1])

    return new Map(intentList)
  }

  getIntentsFor(categoryName: string): IntentsMap | undefined {
    if (categoryName === 'all') {
      return this.#intentsService.getIntents()
    }
    const intents = this.#col.get()[categoryName]
    if (!intents) {
      return undefined
    }
    const intentMap: IntentsMap = new Map()

    const allIntents = this.#intentsService.getIntents()
    for (const intent of intents) {
      intentMap.set(intent, allIntents.get(intent) || 0)
    }

    return intentMap
  }

  entries(): Array<[string, string[]]> {
    return Array.from(Object.entries(this.#col.get()))
  }
}