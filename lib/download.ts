import type { ODSConfig, ODSDataset } from '#types'
import axios from '@data-fair/lib-node/axios.js'
import { type Filtre, type FiltresDeLImport } from '../types/importConfig/index.ts'
import type { CatalogPlugin, GetResourceContext, Resource } from '@data-fair/types-catalogs'
import path from 'path'
import fs from 'fs'

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
  const resource: Resource = {
    id: dataset.dataset_id,
    title: dataset.metas?.default?.title ?? '',
    description: dataset.metas?.default?.description ?? '',
    keywords: dataset.metas?.default?.keyword ?? [],
    format: 'csv',
    origin: catalogConfig.url + '/explore/dataset/' + dataset.dataset_id,
    filePath: ''
  }
  if (dataset.metas?.default?.license && dataset.metas?.default?.license_url) {
    resource.license = {
      title: dataset.metas?.default?.license,
      href: dataset.metas?.default?.license_url,
    }
  }
  return resource
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
export const downloadResource = async ({ catalogConfig, resourceId, importConfig, tmpDir, log }: GetResourceContext<ODSConfig>): Promise<string> => {
  const odsParams: Record<string, string> = {
    select: '*'
  }

  const constraints: FiltresDeLImport = importConfig?.filters

  if (constraints?.length) {
    const where = constraints.map((cons: Filtre) => {
      if (/^\d/.test(cons.field.name)) {
        throw new Error('Champ de filtrage invalide : il ne peut pas commencer par un chiffre')
      }

      const conditions = cons.valeurs.map(valeur => {
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
            throw new Error('Type de champ non supporté dans les filtres')
        }
      })

      return `(${conditions.join(' or ')})`
    }).join(' and ')

    odsParams.where = where
  }

  const url = `${catalogConfig.url}/api/explore/v2.1/catalog/datasets/${resourceId}/exports/csv`
  const destFile = path.join(tmpDir, `${resourceId}.csv`)
  const writer = fs.createWriteStream(destFile)

  try {
    const response = await axios.get(url, {
      params: odsParams,
      responseType: 'stream'
    })

    let downloadedBytes = 0
    log.task(`download ${resourceId}`, 'File size: unknow', NaN)

    response.data.on('data', (chunk: any) => {
      downloadedBytes += chunk.length
      log.progress(`download ${resourceId}`, downloadedBytes)
    })

    response.data.pipe(writer)

    return new Promise<string>((resolve, reject) => {
      response.data.pipe(writer)

      writer.on('finish', () => resolve(destFile))
      writer.on('error', (err: any) => {
        fs.unlink(destFile, () => { })
        reject(err)
      })

      response.data.on('error', (err: any) => {
        fs.unlink(destFile, () => { })
        reject(err)
      })
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du dataset ODS (stream)', error)
    throw new Error('Erreur pendant le téléchargement du dataset ODS en streaming')
  }
}
