import type CatalogPlugin from '@data-fair/types-catalogs'
import { importConfigSchema, configSchema, assertConfigValid, type ODSConfig } from '#types'
import { type ODSCapabilities, capabilities } from './lib/capabilities.ts'
// API Doc: https://data.economie.gouv.fr/api/explore/v2.1/console

const plugin: CatalogPlugin<ODSConfig, ODSCapabilities> = {
  async prepare (context) {
    const prepare = (await import('./lib/prepare.ts')).default
    return prepare(context)
  },

  async list (context) {
    const { listResources } = await import('./lib/imports.ts')
    return listResources(context)
  },
  async getResource (context) {
    const { getResource } = await import('./lib/download.ts')
    return getResource(context)
  },
  metadata: {
    title: 'ODS',
    capabilities
  },
  configSchema,
  importConfigSchema,
  assertConfigValid,
}
export default plugin
