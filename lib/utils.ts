import type { Resource } from '@data-fair/lib-common-types/catalog/index.js'
import type { ODSConfig, ODSDataset } from '#types'

/**
 * Transform an ODS catalog into a Data-Fair catalog
 * @param catalogConfig the ODS configuration [ex: { url: 'https://example.com/api/explore/v2.1' }]
 * @param odsDataset the dataset to transform
 * @param nbRows the number of rows in the dataset
 * @returns an object containing the count of resources, the transformed resources, and an empty path array
 */
export const prepareCatalog = (catalogConfig: ODSConfig, odsCatalog: ODSDataset[]): Resource[] => {
  const catalog: Resource[] = []

  for (const odsDataset of odsCatalog) {
    const resource = prepareResource(catalogConfig, odsDataset)
    catalog.push(resource)
  }
  return catalog
}

export const prepareResource = (catalogConfig: ODSConfig, odsDataset: ODSDataset): Resource => {
  const resource: Resource = {
    id: odsDataset.dataset_id,
    title: odsDataset.metas?.default?.title ?? '',
    description: odsDataset.metas?.default?.description ?? '',
    keywords: odsDataset.metas?.default?.keyword ?? [],
    format: 'csv',
    url: catalogConfig.url + '/catalog/datasets/' + odsDataset.dataset_id + '/exports/csv',
    type: 'resource',
    // pas recup dans le schema ODS
    // license: odsDataset.metas?.default?.license ?? ''
    // fileName?: string;
    // mimeType?: string;
    // size?: number;
    // keywords?: string[];
    // image?: string;
    // frequency?: string;
    // private?: boolean;
  }
  return resource
}
