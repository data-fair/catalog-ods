import { type ODSConfig } from '#types'
import axios from '@data-fair/lib-node/axios.js'
import capabilities from './capabilities.ts'
import { prepareCatalog } from './utils.ts'
import type { ListContext, Folder, Resource, DownloadResourceContext } from '@data-fair/lib-common-types/catalog/index.js'

/**
 * Returns the catalog [list of dataset] from an ODS service
 * @param config the ODS configuration
 * @returns the list of Resources available on this catalog
 */
const list = async (config: ListContext<ODSConfig, typeof capabilities>): Promise<{ count: number; results: (Folder | Resource)[]; path: Folder[] }> => {
  const odsParams: Record<string, any> = {}
  if (config.params?.partName) odsParams.where = 'search("' + config.params.partName + '")'
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
const getResource = async (catalogConfig: ODSConfig, datasetId: string): Promise<Resource> => {
  let dataset
  try {
    dataset = (await axios.get(`${catalogConfig.url}/api/explore/v2.1/catalog/datasets/${datasetId}?select=exclude(features),exclude(attachments),exclude(alternative_exports),exclude(fields)`)).data
  } catch (e) {
    console.error(`Error fetching datasets from ODS ${e}`)
    throw new Error('Erreur lors de la récuperation de la resource ODS')
  }
  const res = prepareCatalog(catalogConfig, [dataset])[0]
  return res
}

const downloadResource = async ({ catalogConfig, resourceId, importConfig, tmpDir }: DownloadResourceContext<ODSConfig>): Promise<string | undefined> => {
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
const getRowsWithAValue = async (catalogConfig: ODSConfig, datasetId: string, constraints: { field: { name: string; type: string }; valeurs: { val: string }[] }[]): Promise<any[]> => {
  var odsParams = {
    select: '*',
    where: ''
  }

  if (constraints && constraints[0] && constraints[0].field) {
    // verifie si une cle ne commence pas par un chiffre
    // constraints.forEach((cons: { field: string; }) => {
    //   if (cons.field  && (typeof cons.field !== 'string' || /^\d/.test(cons.field)))
    //     throw new Error(`Invalid field name: ${cons.field}. Field names cannot start with a digit.`)
    // })

    odsParams.where = constraints.map((cons: { valeurs: any[]; field: { name: string; type: string }; }) => {
      if (/^\d/.test(cons.field.name)) {
        throw new Error('Champ de filtrage invalide, il ne peut pas commencer par un chiffre')
      }
      return cons.valeurs.map((valeur: { val: string }) => {
        switch (cons.field.type) {
          case 'text':
            return `${cons.field.name} = "${valeur.val}"`
          case 'int':
          case 'double':
            return `${cons.field.name} = ${valeur.val}`
          case 'date':
          case 'datetime':
            return `${cons.field.name} = date'${valeur.val}'`
          default:
            return `${cons.field.name} is ${valeur.val}`
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

export { list, getResource, downloadResource, getRowsWithAValue }
