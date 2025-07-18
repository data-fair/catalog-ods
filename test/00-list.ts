/* eslint-disable */

import { type ODSConfig } from '#types'
import { strict as assert } from 'node:assert'
import { it, describe } from 'node:test'
import { listResources } from '../lib/imports.ts'
import capabilities from '../lib/capabilities.ts'
import type {  ListResourcesContext } from '@data-fair/types-catalogs'

const catalogConfig: ODSConfig = {
  url: 'https://opendata.agenceore.fr'
}
const config: ListResourcesContext<ODSConfig, typeof capabilities> = {
  catalogConfig: catalogConfig,
  params: { size: -1 },
  secrets: {}
}

describe('test the listResources function', () => {

  it('test listResources with a valid configuration', async () => {
    // requete correspondante à : https://opendata.agenceore.fr/api/explore/v2.1/catalog/datasets
    const catalog = await listResources(config)
    assert.ok(catalog.count === catalog.results.length || catalog.results.length === config.params.size, 'the count and the results length should match (or should reach the limit)')
    assert.ok(catalog.count > 0, 'it should have at least one result')
    assert.ok(catalog.results.some(dataset => {
      return dataset.id === 'registre-national-installation-production-stockage-electricite-agrege-311221'
    }),
      'the resource "registre-national-installation-production-stockage-electricite-agrege-311221" should be present')
  })

  it('test listResources with an invalid configuration (invalid url)', async () => {
    try {
      await listResources({
        catalogConfig: { url: 'https://example.com' },
        params: config.params,
        secrets: {}
      })
    } catch (error) {
      assert.ok(error instanceof Error, 'Error should be an instance of Error')
      return
    }
    assert.fail('Expected an error to be thrown for invalid catalogConfig')
  })

  it('test listResources with an invalid configuration', async () => {
    try {
      await listResources({
        catalogConfig: config.catalogConfig,
        params: { size: 100000 }, // the maximum (in ODS API) is 1000
        secrets: {}
      })
    } catch (error) {
      assert.ok(error instanceof Error, 'Error should be an instance of Error')
      return
    }
    assert.fail('Expected an error to be thrown for invalid catalogConfig')
  })
})
