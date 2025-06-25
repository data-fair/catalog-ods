import type { CatalogPlugin, CatalogMetadata, ListContext, DownloadResourceContext } from '@data-fair/lib-common-types/catalog/index.js'

import { schema as configSchema, assertValid as assertConfigValid, type ODSConfig } from './types/config/index.ts'
import capabilities from './lib/capabilities.ts'
import { schema as importConfigSchema } from './types/importConfig/index.ts'
// API Doc: https://data.economie.gouv.fr/api/explore/v2.1/console

const list = async (context: ListContext<ODSConfig, typeof capabilities>) => {
  const { list } = await import('./lib/imports.ts')
  return list(context)
}

const getResource = async (catalogConfig: ODSConfig, resourceId: string) => {
  const { getResource } = await import('./lib/imports.ts')
  return getResource(catalogConfig, resourceId)
}

const downloadResource = async ({ catalogConfig, resourceId, importConfig, tmpDir }: DownloadResourceContext<ODSConfig>) => {
  const { downloadResource } = await import('./lib/download.ts')
  return downloadResource({ catalogConfig, resourceId, importConfig, tmpDir })
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
  importConfigSchema,
  assertConfigValid,
  metadata
}
export default plugin
