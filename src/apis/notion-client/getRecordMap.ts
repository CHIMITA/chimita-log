import { createNotionAPI } from "./createNotionAPI"

export const getRecordMap = async (pageId: string) => {
  const api = createNotionAPI()
  const recordMap = await api.getPage(pageId)
  return recordMap
}
