import { CONFIG } from "site.config"
import { idToUuid } from "notion-utils"

import { notionApi, withNotionRetry } from "./client"
import getAllPageIds from "src/libs/utils/notion/getAllPageIds"
import getPageProperties from "src/libs/utils/notion/getPageProperties"
import { TPosts } from "src/types"

/**
 * @param {{ includePages: boolean }} - false: posts only / true: include pages
 */

let postsPromise: Promise<TPosts> | null = null

const fetchPosts = async () => {
  let id = CONFIG.notionConfig.pageId as string

  const response = await withNotionRetry(() => notionApi.getPage(id))
  id = idToUuid(id)
  const collectionRecord = Object.values(response.collection)[0]?.value as any
  const collection = collectionRecord?.value ?? collectionRecord
  let block = response.block
  const schema = collection?.schema

  const blockValue = (block[id].value as any)?.value ?? block[id].value
  const rawMetadata = blockValue

  // Check Type
  if (
    rawMetadata?.type !== "collection_view_page" &&
    rawMetadata?.type !== "collection_view"
  ) {
    return []
  } else {
    // Construct Data
    let pageIds = getAllPageIds(response)

    if (pageIds.length === 0) {
      const collectionId = collection?.id ?? Object.keys(response.collection)[0]
      const collectionViewId = Object.keys(response.collection_view || {})[0]
      const collectionView =
        response.collection_view?.[collectionViewId]?.value ?? null

      if (!collectionId || !collectionViewId || !collectionView) {
        return []
      }

      const collectionData = (await withNotionRetry(() =>
        notionApi.getCollectionData(
          collectionId,
          collectionViewId,
          collectionView
        )
      )) as any

      pageIds =
        collectionData?.result?.reducerResults?.collection_group_results
          ?.blockIds ?? []
      block = collectionData?.recordMap?.block ?? block
    }

    const data = []
    for (let i = 0; i < pageIds.length; i++) {
      const id = pageIds[i]
      const properties = (await getPageProperties(id, block, schema)) || null
      // Add fullwidth, createdtime to properties
      const pageBlockValue = (block[id].value as any)?.value ?? block[id].value
      properties.createdTime = new Date(pageBlockValue?.created_time).toString()
      properties.fullWidth =
        (pageBlockValue?.format as any)?.page_full_width ?? false

      data.push(properties)
    }

    // Sort by date
    data.sort((a: any, b: any) => {
      const dateA: any = new Date(a?.date?.start_date || a.createdTime)
      const dateB: any = new Date(b?.date?.start_date || b.createdTime)
      return dateB - dateA
    })

    const posts = data as TPosts
    return posts
  }
}

export const getPosts = async () => {
  if (!postsPromise) {
    postsPromise = fetchPosts().catch((error) => {
      postsPromise = null
      throw error
    })
  }

  return postsPromise
}
