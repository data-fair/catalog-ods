import type { CatalogPlugin, CatalogMetadata, CatalogDataset } from '@data-fair/lib-common-types/catalog/index.js'
import type { ODSDataset } from '#types'

import { schema as configSchema, assertValid as assertConfigValid, type ODSConfig } from './types/config/index.ts'
import axios from '@data-fair/lib-node/axios.js'
import { httpError } from '@data-fair/lib-utils/http-errors.js'
import { prepareDataset } from './lib/utils.ts'

// API Doc: https://data.economie.gouv.fr/api/explore/v2.1/console

const listDatasets = async (catalogConfig: ODSConfig, params: { q?: string, size?: number, page?: number }) => {
  const odsParams: Record<string, any> = {}
  if (params?.q) odsParams.where = '"' + params.q + '"'
  if (params?.size) odsParams.limit = params.size
  if (params?.page) odsParams.offset = (params.page - 1) * (params.size || 10)

  let res
  try {
    res = (await axios.get(`${catalogConfig.url}/catalog/datasets?select=exclude(features),exclude(attachments),exclude(alternative_exports),exclude(fields)`, { params: odsParams })).data
  } catch (e) {
    throw httpError(500, `Error fetching datasets from ODS: ${e}`)
  }
  const datasets: CatalogDataset[] = res.results.map((dataset: ODSDataset) => prepareDataset(catalogConfig, dataset))

  return {
    count: res.total_count,
    results: datasets
  }
}

const getDataset = async (catalogConfig: ODSConfig, datasetId: string) => {
  const dataset = (await axios.get(`${catalogConfig.url}/catalog/datasets/${datasetId}`)).data
  return prepareDataset(catalogConfig, dataset)
}

const capabilities = [
  'listDatasets' as const,
  'search' as const,
  'pagination' as const,
]

const metadata: CatalogMetadata<typeof capabilities> = {
  title: 'Catalog ODS',
  description: 'Importez des jeux de données depuis une solution Opendatasoft.',
  capabilities
}

const plugin: CatalogPlugin<ODSConfig, typeof capabilities> = {
  listDatasets,
  getDataset,
  configSchema,
  assertConfigValid,
  metadata
}
export default plugin
