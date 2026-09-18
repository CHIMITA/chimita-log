import { NotionAPI } from "notion-client"

/**
 * Notion's private API broke notion-client v6 in two independent ways:
 *
 * 1. It answers 403 to any request whose User-Agent identifies as `got`,
 *    the HTTP client notion-client ships with, so we send a browser one.
 * 2. It wraps every record one level deeper — `{ value: { value: <record>, role } }`
 *    where the library expects `{ role, value: <record> }` — which makes block and
 *    collection lookups resolve to undefined, so `getPage` skips its collection
 *    queries and hands back an empty post list.
 *
 * Every NotionAPI method funnels through `fetch`, so wrapping it fixes both for the
 * whole library, including the collection queries `getPage` runs internally.
 */
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"

const unwrapRecord = (record: any) =>
  record?.value?.value
    ? {
        ...record,
        role: record.value.role ?? record.role,
        value: record.value.value,
      }
    : record

const unwrapRecordMap = (recordMap: any) => {
  if (!recordMap || typeof recordMap !== "object") return
  for (const table of Object.values<any>(recordMap)) {
    if (!table || typeof table !== "object") continue
    for (const [id, record] of Object.entries(table)) {
      table[id] = unwrapRecord(record)
    }
  }
}

const normalizeResponse = (response: any) => {
  if (!response || typeof response !== "object") return response
  unwrapRecordMap(response.recordMap)
  unwrapRecordMap(response.recordMapWithRoles)
  if (Array.isArray(response.results)) {
    response.results = response.results.map(unwrapRecord)
  }
  return response
}

export const createNotionAPI = () => {
  const api = new NotionAPI()
  const fetch = (api as any).fetch.bind(api)

  ;(api as any).fetch = async (args: any) =>
    normalizeResponse(
      await fetch({
        ...args,
        gotOptions: {
          ...args.gotOptions,
          headers: {
            "user-agent": USER_AGENT,
            ...args.gotOptions?.headers,
          },
        },
      })
    )

  return api
}
