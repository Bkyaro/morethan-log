import { NotionAPI } from "notion-client"

export const notionApi = new NotionAPI()

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const isRateLimitError = (error: any) => {
  return error?.response?.statusCode === 429 || error?.statusCode === 429
}

export const withNotionRetry = async <T>(
  task: () => Promise<T>,
  retryCount = 3
) => {
  let attempt = 0

  while (attempt <= retryCount) {
    try {
      return await task()
    } catch (error) {
      if (attempt === retryCount || !isRateLimitError(error)) {
        throw error
      }

      await sleep(500 * (attempt + 1))
      attempt += 1
    }
  }

  throw new Error("Unreachable")
}
