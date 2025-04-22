import type { CatalogDataset } from '@data-fair/lib-common-types/catalog.js'
import type { ODSConfig, ODSDataset } from '#types'

export const prepareDataset = (catalogConfig: ODSConfig, odsDataset: ODSDataset): CatalogDataset => {
  const dataset: CatalogDataset = {
    id: odsDataset.dataset_id,
    title: odsDataset.metas?.default?.title ?? '',
    description: odsDataset.metas?.default?.description ?? '',
    keywords: odsDataset.metas?.default?.keyword ?? [],
    resources: [{
      id: 'resource_' + odsDataset.dataset_id,
      title: odsDataset.metas?.default?.title ?? '',
      // Use the list of format exports available in the ODS API
      // https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/exports
      format: 'csv',
      url: catalogConfig.url + '/catalog/datasets/' + odsDataset.dataset_id + '/exports/csv',
    }]
  }
  return dataset
}
