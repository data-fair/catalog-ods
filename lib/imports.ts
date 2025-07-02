import type { ODSDataset, ODSConfig } from '#types'
import axios from '@data-fair/lib-node/axios.js'
import capabilities from './capabilities.ts'
import type { CatalogPlugin, ListContext } from '@data-fair/types-catalogs'

type ResourceList = Awaited<ReturnType<CatalogPlugin['list']>>['results']

/**
 * Transform an ODS catalog into a Data-Fair catalog
 * @param catalogConfig the ODS configuration [ex: { url: 'https://example.com' }]
 * @param odsDataset the dataset to transform
 * @returns an object containing the count of resources, the transformed resources, and an empty path array
 */
const prepareCatalog = (catalogConfig: ODSConfig, odsCatalog: ODSDataset[]): ResourceList => {
  const catalog: ResourceList = []

  for (const odsDataset of odsCatalog) {
    catalog.push({
      id: odsDataset.dataset_id,
      title: odsDataset.metas?.default?.title ?? '',
      description: odsDataset.metas?.default?.description ?? '',
      format: 'csv',
      origin: catalogConfig.url + '/explore/dataset/' + odsDataset.dataset_id,
      type: 'resource'
    } as ResourceList[number])
  }
  return catalog
}

/**
 * Returns the catalog [list of dataset] from an ODS service
 * @param config the ODS configuration
 * @returns the list of Resources available on this catalog
 */
export const list = async (config: ListContext<ODSConfig, typeof capabilities>): ReturnType<CatalogPlugin<ODSConfig>['list']> => {
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
