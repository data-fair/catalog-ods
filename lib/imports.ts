import { type ODSConfig } from '#types'
import axios from '@data-fair/lib-node/axios.js'
import capabilities from './capabilities.ts'
import { prepareCatalog } from './utils.ts'
import type { ListContext, Folder, Resource, GetResourceContext } from '@data-fair/lib-common-types/catalog/index.js'

/**
 * Returns the catalog [list of dataset] from an ODS service
 * @param config the ODS configuration
 * @returns the list of Resources available on this catalog
 */
const list = async (config: ListContext<ODSConfig, typeof capabilities>): Promise<{ count: number; results: (Folder | Resource)[]; path: Folder[] }> => {
  const odsParams: Record<string, any> = {}
  if (config.params?.q) odsParams.where = 'search("' + config.params.q + '")'
  if (config.params?.size) odsParams.limit = config.params.size
  if (config.params?.page) odsParams.offset = (config.params.page - 1) * (config.params.size || 10)

  let res
  try {
    res = (await axios.get(`${config.catalogConfig.url}/api/explore/v2.1/catalog/datasets?select=exclude(features),exclude(attachments),exclude(alternative_exports),exclude(fields)`, { params: odsParams })).data
  } catch (e) {
    console.error(`Error fetching datasets from ODS ${e}`)
    throw new Error('Erreur lors de la récuperation de la resource ODS')
  }

  const catalog = prepareCatalog(config.catalogConfig, res.results)
  return {
    count: res.total_count,
    results: catalog,
    path: []
  }
}

/**
 * Returns the ODS Dataset
 * @param catalogConfig the ODS configuration [ex: { url: 'https://example.com/api/explore/v2.1' }]
 * @param datasetId the dataset ID to fetch fields from
 * @returns the Resource corresponding to the id by this configuration
 */
const getResource = async ({ catalogConfig, resourceId }: GetResourceContext<ODSConfig>): Promise<Resource> => {
  let dataset
  try {
    dataset = (await axios.get(`${catalogConfig.url}/api/explore/v2.1/catalog/datasets/${resourceId}?select=exclude(features),exclude(attachments),exclude(alternative_exports),exclude(fields)`)).data
  } catch (e) {
    console.error(`Error fetching datasets from ODS ${e}`)
    throw new Error('Erreur lors de la récuperation de la resource ODS')
  }
  const res = prepareCatalog(catalogConfig, [dataset])[0]
  return res
}

export { list, getResource }
