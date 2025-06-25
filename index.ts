import type { CatalogPlugin } from '@data-fair/lib-common-types/catalog/index.js'

import { schema as configSchema, assertValid as assertConfigValid, type ODSConfig } from './types/config/index.ts'
import capabilities from './lib/capabilities.ts'
import { schema as importConfigSchema } from './types/importConfig/index.ts'
// API Doc: https://data.economie.gouv.fr/api/explore/v2.1/console

const plugin: CatalogPlugin<ODSConfig, typeof capabilities> = {
  async prepare () { return {} },
  async list (context) {
    const { list } = await import('./lib/imports.ts')
    return list(context)
  },
  async getResource (context) {
    const { getResource } = await import('./lib/imports.ts')
    return getResource(context)
  },
  async downloadResource (context) {
    const { downloadResource } = await import('./lib/download.ts')
    return downloadResource(context)
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
