import { notionApi, withNotionRetry } from "./client"

const normalizeTable = (table: Record<string, any> = {}) => {
  return Object.fromEntries(
    Object.entries(table).map(([key, entry]) => {
      const nestedValue = entry?.value

      if (
        nestedValue &&
        typeof nestedValue === "object" &&
        "value" in nestedValue &&
        "role" in nestedValue
      ) {
        return [
          key,
          {
            ...entry,
            role: nestedValue.role,
            value: nestedValue.value,
          },
        ]
      }

      return [key, entry]
    })
  )
}

export const getRecordMap = async (pageId: string) => {
  const recordMap = await withNotionRetry(() => notionApi.getPage(pageId))

  return {
    ...recordMap,
    block: normalizeTable(recordMap.block),
    collection: normalizeTable(recordMap.collection),
    collection_view: normalizeTable(recordMap.collection_view),
    notion_user: normalizeTable(recordMap.notion_user),
  }
}
