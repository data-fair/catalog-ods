import type { ODSConfig } from '#types'
import type { ODSCapabilities } from './capabilities.ts'
import type { PrepareContext } from '@data-fair/types-catalogs'
import axios from '@data-fair/lib-node/axios.js'

export default async ({ catalogConfig }: PrepareContext<ODSConfig, ODSCapabilities>) => {
  if (!catalogConfig.url) {
    throw new Error('Catalog configuration is missing the "url" property.')
  }

  try {
    await axios.get(`${catalogConfig.url}/api/explore/v2.1/catalog/datasets`)
  } catch (error) {
    console.error(`Error connecting to ODS API at ${catalogConfig.url}:`, error)
    throw new Error(`Unable to connect to ODS API at ${catalogConfig.url}. Please check the URL and your network connection.`)
  }

  return {
    catalogConfig
  }
}
