import type { ODSConfig, ODSDataset, Filter, ImportFilters, Attachments } from '#types'
import axios from '@data-fair/lib-node/axios.js'
import type { CatalogPlugin, GetResourceContext, Resource } from '@data-fair/types-catalogs'
import path from 'path'
import fs from 'fs'

/**
 * Downloads the dataset and its attachments, retrieves its metadata and returns the dataset metadata with the downloaded file path included.
 * @param context The context containing the catalog configuration and resource identifier.
 * @returns A promise that resolves to the dataset metadata with the downloaded file path included.
 */
export const getResource = async (context: GetResourceContext<ODSConfig>): ReturnType<CatalogPlugin['getResource']> => {
  await context.log.step('Téléchargement du fichier')
  const dataset = await getMetaData(context)
  dataset.attachments = await getAttachments(context)
  dataset.filePath = await downloadResource(context)
  return dataset
}

/**
 * Returns the metadata of the ODS dataset for a given resource identifier.
 *
 * This function retrieves the main information of the dataset such as:
 * - `title`: the dataset title
 * - `description`: the dataset description
 * - `keywords`: associated keywords
 * - `format`: the dataset format (`csv`)
 * - `topics`: Data Fair topics associated via a correspondence table
 * - `origin`: the original URL of the dataset on ODS
 * - `schema`: the structure of the dataset fields (`name`, `description`, `title`)
 * - `license`: (if available) the license information with `title` and `href`
 * - `attachments` (initialized, filled later)
 * - `filePath` (initialized, filled later)
 *
 * @param catalogConfig the ODS configuration
 * @param resourceId the identifier of the dataset to retrieve
 * @param log the logger to record errors
 * @returns A promise resolved with the ODS dataset metadata
 * @throws If an error occurs while retrieving metadata.
 */
const getMetaData = async ({ catalogConfig, resourceId, log }: GetResourceContext<ODSConfig>): Promise<Resource> => {
  let dataset: ODSDataset
  try {
    dataset = (await axios.get(`${catalogConfig.url}/api/explore/v2.1/catalog/datasets/${resourceId}?select=exclude(attachments),exclude(alternative_exports)`)).data
  } catch (e) {
    console.error(`Error fetching datasets from ODS ${e}`)
    await log.error(`Erreur pendant la récuperation des données depuis ODS ${e instanceof Error ? e.message : String(e)}`)
    throw new Error('Erreur lors de la récuperation de la resource ODS')
  }
  const resource: Resource = {
    id: dataset.dataset_id,
    title: dataset.metas?.default?.title ?? '',
    description: dataset.metas?.default?.description ?? '',
    keywords: dataset.metas?.default?.keyword ?? [],
    format: 'csv',
    origin: catalogConfig.url + '/explore/dataset/' + dataset.dataset_id,
    topics: correspondanceThemes(dataset.metas?.default?.theme, catalogConfig.themes),
    attachments: [],  // Will be filled later with getAttachments
    filePath: '',     // Will be filled later with downloadResource
  }

  if (dataset.metas?.default?.license && dataset.metas?.default?.license_url) {
    resource.license = {
      title: dataset.metas?.default?.license,
      href: dataset.metas?.default?.license_url,
    }
  }

  const containsGeoShape = dataset.fields?.some((field) => field.type === 'geo_shape')
  resource.schema = dataset.fields?.map((OdsField) => {
    const geoFormat: { [key: string]: any } = {}
    if (OdsField.type === 'geo_point_2d' && !containsGeoShape) {
      geoFormat['x-refersTo'] = 'http://www.w3.org/2003/01/geo/wgs84_pos#lat_long'
    } else if (OdsField.type === 'geo_shape') {
      geoFormat['x-refersTo'] = 'https://purl.org/geojson/vocab#geometry'
    }
    return {
      key: OdsField.name,
      description: OdsField.description ?? '',
      title: OdsField.label,
      ...geoFormat
    }
  })

  // Ajouter meta donnees geographique

  return resource
}

/**
 * Downloads the rows of a dataset matching the given filters and saves them as a `.csv.gz` file in a temporary directory.
 *
 * @param catalogConfig - The ODS configuration object.
 * @param resourceId - The ID of the dataset to download.
 * @param importConfig - The import configuration, including filters to apply.
 * @param tmpDir - The path to the temporary directory where the CSV will be saved.
 * @param log - The logger to record progress and errors.
 * @returns A promise resolving to the file path of the downloaded dataset.
 * @throws If there is an error writing the file or fetching the dataset.
 */
const downloadResource = async ({ catalogConfig, resourceId, importConfig, tmpDir, log }: GetResourceContext<ODSConfig>): Promise<string> => {
  // Build the parameters for the ODS API request
  const odsParams: Record<string, string> = {
    select: '*'
  }
  // remove empty contraints
  const constraints: ImportFilters = (importConfig.filters || []).filter((f: Filter) => f.field.name && f.vals && f.vals.length > 0)

  if (constraints?.length) {
    const where = constraints.map((cons: Filter) => {
      if (/^\d/.test(cons.field.name)) {
        throw new Error('Champ de filtrage invalide : il ne peut pas commencer par un chiffre (pour le champ ' + cons.field.name + ')')
      }

      const conditions = cons.vals.map(valeur => {
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
            throw new Error(`Type de champ pour ${cons.field.name} non supporté dans les filtres`)
        }
      })
      return `(${conditions.join(' or ')})`
    }).join(' and ')

    odsParams.where = where
  }

  const url = `${catalogConfig.url}/api/explore/v2.1/catalog/datasets/${resourceId}/exports/csv?compressed=true`
  const destFile = path.join(tmpDir, `${resourceId}.csv.gz`)
  const writer = fs.createWriteStream(destFile)

  // Send the request to ODS API to download the dataset
  try {
    const response = await axios.get(url, {
      params: odsParams,
      responseType: 'stream'
    })

    let downloadedBytes = 0
    await log.task(`download ${resourceId}`, 'File size: unknow', NaN)

    const logInterval = 500 // ms
    let lastLogged = Date.now()

    response.data.on('data', (chunk: any) => {
      downloadedBytes += chunk.length
      const now = Date.now()
      if (now - lastLogged > logInterval) {
        lastLogged = now
        log.progress(`download ${resourceId}`, downloadedBytes)
      }
    })

    response.data.pipe(writer)

    const result = await new Promise<string>((resolve, reject) => {
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

    const stats = fs.statSync(destFile)
    await log.progress(`download ${resourceId}`, stats.size, stats.size)

    return result
  } catch (error) {
    console.error('Erreur lors de la récupération du dataset ODS (stream)', error)
    await log.error('Erreur lors de la récupération du dataset ODS (stream)', error instanceof Error ? error.message : String(error))
    throw new Error('Erreur pendant le téléchargement du dataset ODS en streaming')
  }
}

/**
 * Builds a set of topics based on the themes from ODS and the corresponding Data Fair themes.
 * @param odsThemes - The themes from the ODS dataset.
 * @param tableCorrespondances - The mapping table between ODS themes and Data Fair themes.
 * @returns A set of Data Fair topics corresponding to the ODS themes. If no matching themes are found, an empty set is returned.
 */
const correspondanceThemes = (odsThemes: string[] | undefined, tableCorrespondances: ODSConfig['themes']
): Resource['topics'] => {
  if (!Array.isArray(odsThemes) || odsThemes.length === 0) {
    return undefined
  }
  if (!Array.isArray(tableCorrespondances) || tableCorrespondances.length === 0) {
    return undefined
  }

  const themesDF: Resource['topics'] = []

  for (const odsTheme of odsThemes) {
    const theme = tableCorrespondances.find((themeTable) => themeTable.value === odsTheme)
    if (theme) {
      theme.dataFairThemes.forEach((dfTheme) => {
        if (!themesDF.some(t => JSON.stringify(t) === JSON.stringify(dfTheme))) {
          themesDF.push(dfTheme)
        }
      })
    }
  }

  return themesDF.length > 0 ? themesDF : undefined
}

/**
 * Downloads the attachments of a dataset from ODS and saves them to a temporary directory.
 * @param importConfig - The import configuration containing the attachments to download.
 * @param log - The logger to record progress and errors.
 * @param tmpDir - The path to the temporary directory where the attachments will be saved.
 * @returns An array of attachments containing the title and filePath of each downloaded attachment.
 * @throws If an error occurs during the download of any attachment.
 */
const getAttachments = async ({ importConfig, log, tmpDir }: GetResourceContext<ODSConfig>): Promise<Resource['attachments']> => {
  const attachmentODS: Attachments = importConfig.attachments || []
  const attachmentsDF: Resource['attachments'] = []

  for (const attachment of attachmentODS) {
    const url = attachment.metas.url
    const filePath = path.join(tmpDir, attachment.metas.title)

    try {
      const response = await axios.get(url, { responseType: 'stream' })
      const writer = fs.createWriteStream(filePath)

      await new Promise<void>((resolve, reject) => {
        response.data.pipe(writer)
        writer.on('finish', resolve)
        writer.on('error', reject)
        response.data.on('error', reject)
      })

      attachmentsDF.push({
        title: attachment.metas.title,
        filePath,
      })
      const stats = fs.statSync(filePath)
      await log.info(`Pièce jointe ${attachment.metas.title} téléchargée. Taille : ${stats.size} octets`)
    } catch (error) {
      await log.error(
        `Erreur lors du téléchargement de la pièce jointe ${attachment.metas.title}`,
        error instanceof Error ? error.message : String(error)
      )
      console.error(`Erreur lors du téléchargement de la pièce jointe ${attachment.metas.title}`, error)
    }
  }

  return attachmentsDF
}
