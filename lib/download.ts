import { type ODSConfig } from '#types'
import axios from '@data-fair/lib-node/axios.js'
import { type Filtre, type FiltresDeLImport } from '../types/importConfig/index.ts'
import type { DownloadResourceContext } from '@data-fair/lib-common-types/catalog/index.js'

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
const getRowsWithAValue = async (catalogConfig: ODSConfig, datasetId: string, constraints: FiltresDeLImport): Promise<string> => {
  const odsParams = {
    select: '*',
    where: ''
  }

  if (constraints && constraints[0]) {
    // verifie si une cle ne commence pas par un chiffre
    // constraints.forEach((cons: { field: string; }) => {
    //   if (cons.field  && (typeof cons.field !== 'string' || /^\d/.test(cons.field)))
    //     throw new Error(`Invalid field name: ${cons.field}. Field names cannot start with a digit.`)
    // })

    odsParams.where = constraints.filter(cons => cons.field && cons.valeurs).map((cons: Filtre) => {
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
          default :
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

export { downloadResource, getRowsWithAValue }
