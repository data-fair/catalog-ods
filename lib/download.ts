import type { ODSConfig, ODSDataset } from '#types'
import axios from '@data-fair/lib-node/axios.js'
import { type Filtre, type FiltresDeLImport } from '../types/importConfig/index.ts'
import type { CatalogPlugin, GetResourceContext, Resource } from '@data-fair/types-catalogs'

/**
 * Retrieves a resource by first fetching its metadata and then downloading the actual resource.
 * The downloaded file path is added to the dataset metadata before returning.
 *
 * @param context - The context containing configuration and parameters required to fetch and download the resource.
 * @returns A promise that resolves to the dataset metadata with the downloaded file path included.
 */
export const getResource = async (context: GetResourceContext<ODSConfig>): ReturnType<CatalogPlugin['getResource']> => {
  const dataset = await getMetaData(context)
  dataset.filePath = await downloadResource(context)
  return dataset
}

/**
 * Returns the ODS Dataset
 * @param catalogConfig the ODS configuration [ex: { url: 'https://example.com' }]
 * @param resourceId the dataset ID to fetch fields from
 * @returns the Resource corresponding to the id by this configuration
 */
const getMetaData = async ({ catalogConfig, resourceId }: GetResourceContext<ODSConfig>): Promise<Resource> => {
  let dataset: ODSDataset
  try {
    dataset = (await axios.get(`${catalogConfig.url}/api/explore/v2.1/catalog/datasets/${resourceId}?select=exclude(features),exclude(attachments),exclude(alternative_exports),exclude(fields)`)).data
  } catch (e) {
    console.error(`Error fetching datasets from ODS ${e}`)
    throw new Error('Erreur lors de la récuperation de la resource ODS')
  }
  return {
    id: dataset.dataset_id,
    title: dataset.metas?.default?.title ?? '',
    description: dataset.metas?.default?.description ?? '',
    keywords: dataset.metas?.default?.keyword ?? [],
    format: 'csv',
    origin: catalogConfig.url + '/explore/dataset/' + dataset.dataset_id,
    license: {
      title: dataset.metas?.default?.license,
      href: dataset.metas?.default?.license_url,
    },
    filePath: ''
  } as Resource
}

/**
 * Downloads the rows of a dataset matching the given filters and saves them as a CSV file in a temporary directory.
 *
 * @param params.catalogConfig - The ODS configuration object.
 * @param params.resourceId - The ID of the dataset to download.
 * @param params.importConfig - The import configuration, including filters to apply.
 * @param params.tmpDir - The path to the temporary directory where the CSV will be saved.
 * @returns A promise resolving to the file path of the downloaded CSV.
 * @throws If there is an error writing the file or fetching the dataset.
 */
export const downloadResource = async ({ catalogConfig, resourceId, importConfig, tmpDir }: GetResourceContext<ODSConfig>): Promise<string> => {
  const dataset = await getRowsWithAValue(catalogConfig, resourceId, importConfig.filters)

  const fs = await import('node:fs/promises')
  const path = await import('path')
  const destFile = path.join(tmpDir, `${resourceId}.csv`)

  await fs.writeFile(destFile, dataset)
  return destFile
}

/**
 * Returns the rows of a dataset that match the given constraints
 * @param catalogConfig the ODS configuration [ex: { url: 'https://example.com' }]
 * @param datasetId the dataset ID to fetch rows from
 * @param constraints the constraints to apply to the query, as a record of key-value pairs
 *                    where the key is the field name and the value is the value to match
 * @returns an array of rows that match the given constraints
 */
export const getRowsWithAValue = async (catalogConfig: ODSConfig, datasetId: string, constraints: FiltresDeLImport): Promise<string> => {
  const odsParams = {
    select: '*',
    where: ''
  }

  if (constraints && constraints[0]) {
    odsParams.where = constraints.map((cons: Filtre) => {
      if (/^\d/.test(cons.field.name)) {
        throw new Error('Champ de filtrage invalide, il ne peut pas commencer par un chiffre / erreur dans le champ')
      }
      return cons.valeurs.map((valeur) => {
        switch (cons.field.type) {
          case 'text':
            return `${cons.field.name} = "${valeur.name}"`
          case 'int':
          case 'double':
            return `${cons.field.name} = ${valeur.name}`
          case 'date':
          case 'datetime':
            return `${cons.field.name} = date'${valeur.name}'`
          case 'bool':
          case 'boolean':
            return `${cons.field.name} is ${valeur.name}`
          default:
            throw new Error('Format du Champ de filtrage non pris en charge')
        }
      }).join(' or ')
    }).join(' and ')
  }

  try {
    const dataset = (await axios.get(`${catalogConfig.url}/api/explore/v2.1/catalog/datasets/${datasetId}/exports/csv`, { params: odsParams })).data
    return dataset
  } catch (error) {
    console.error(`Error fetching dataset values ${error}`)
    throw new Error('Erreur lors de la récuperation de la resource ODS')
  }
}
