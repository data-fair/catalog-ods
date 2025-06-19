import type { CatalogPlugin, CatalogMetadata, ListContext, DownloadResourceContext } from '@data-fair/lib-common-types/catalog/index.js'

import { schema as configSchema, assertValid as assertConfigValid, type ODSConfig } from './types/config/index.ts'
import capabilities from './lib/capabilities.ts'
import { importConfigSchema } from './lib/importConfigSchema.ts'

// API Doc: https://data.economie.gouv.fr/api/explore/v2.1/console


const list = async (context: ListContext<ODSConfig, typeof capabilities>) => {
  const { list } = await import('./lib/imports.ts')
  return list(context)
}

const getResource = async (catalogConfig: ODSConfig, resourceId: string) => {
  const { getResource } = await import('./lib/imports.ts')
  return getResource(catalogConfig, resourceId)
}

export const downloadResource = async ({ catalogConfig, resourceId, importConfig, tmpDir }: DownloadResourceContext<ODSConfig>) => {
  const { downloadResource } = await import('./lib/imports.ts')
  return downloadResource({ catalogConfig, resourceId, importConfig, tmpDir })
}

const listFiltersSchema: Record<string, any> = {
  type: 'object',
  properties: {
    partName: {
      title: 'Rechercher',
      type: 'string',
      default: '',
    }
  },
  required: [],
  additionalProperties: false
}


const metadata: CatalogMetadata<typeof capabilities> = {
  title: 'Catalog ODS',
  description: 'Importez des jeux de données depuis une solution Opendatasoft.',
  capabilities
}


const plugin: CatalogPlugin<ODSConfig, typeof capabilities> = {
  list,
  getResource,
  downloadResource,
  configSchema,
  listFiltersSchema,
  importConfigSchema,
  assertConfigValid,
  metadata
}
export default plugin
