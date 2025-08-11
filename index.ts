import type { CatalogPlugin } from '@data-fair/types-catalogs'
import { configSchema, assertConfigValid, type ODSConfig } from '#types'
import { type ODSCapabilities, capabilities } from './lib/capabilities.ts'
import { importConfigSchema } from '#types'
// API Doc: https://data.economie.gouv.fr/api/explore/v2.1/console

const plugin: CatalogPlugin<ODSConfig, ODSCapabilities> = {
  async prepare (context) {
    const prepare = (await import('./lib/prepare.ts')).default
    return prepare(context)
  },

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
