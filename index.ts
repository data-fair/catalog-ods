import type { CatalogPlugin } from '@data-fair/types-catalogs'

import { schema as configSchema, assertValid as assertConfigValid, type ODSConfig } from './types/config/index.ts'
import capabilities from './lib/capabilities.ts'
import { schema as importConfigSchema } from './types/importConfig/index.ts'
// API Doc: https://data.economie.gouv.fr/api/explore/v2.1/console

const plugin: CatalogPlugin<ODSConfig, typeof capabilities> = {
  async prepare () { return {} },
  async listResources (context) {
    const { listResources } = await import('./lib/imports.ts')
    return listResources(context)
  },
  async getResource (context) {
    const { getResource } = await import('./lib/download.ts')
    return getResource(context)
  },
  metadata: {
    title: 'Catalog ODS',
    description: 'Importez des jeux de données depuis une solution Opendatasoft.',
    capabilities
  },
  configSchema,
  importConfigSchema,
  assertConfigValid,
}
export default plugin
