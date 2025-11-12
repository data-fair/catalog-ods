import type { ODSDataset, ODSConfig } from '#types'
import { strict as assert } from 'node:assert'
import { it, describe, beforeEach, after } from 'node:test'
import { listResources } from '../lib/imports.ts'
import capabilities from '../lib/capabilities.ts'
import type { ListContext } from '@data-fair/types-catalogs'
import nock from 'nock'

describe('test the listResources function', () => {
  describe('test the listResources function with a mock configuration', () => {
    const catalogConfig: ODSConfig = {
      url: 'https://example.com'
    }
    const config: ListContext<ODSConfig, typeof capabilities> = {
      catalogConfig,
      params: { size: 5, page: 1 },
      secrets: {}
    }

    beforeEach(() => {
      // Reset the mock before each test
      nock.cleanAll()
    })

    after(() => {
      // Clean up after all tests
      nock.restore()
    })

    it('test listResources with a mock configuration', async () => {
      const mockResponse: { total_count: number, results: ODSDataset[] } = {
        total_count: 3,
        results: [
          {
            dataset_id: 'dataset1',
            metas: {
              default: {
                title: 'Mock Dataset 1',
              }
            },
            features: ['analyse', 'geo'],
          },
          {
            dataset_id: 'dataset2',
            metas: {
              default: {
                title: 'Mock Dataset 2',
                description: 'This is a mock dataset for testing purposes.',
                license: 'CC-BY-4.0',
                license_url: 'https://example.com/license',
                themes: ['Mock Theme'],
                keywords: ['mock', 'dataset']
              }
            },
            features: ['analyse'],
          },
          {
            dataset_id: 'dataset3',
            metas: {
              default: {
                title: 'Mock Dataset 3',
                description: 'This is a mock dataset for testing purposes.',
              }
            },
            features: ['analyse'],
          }
        ]
      }
      nock(catalogConfig.url)
        .get('/api/explore/v2.1/catalog/datasets')
        .query({
          select: 'exclude(attachments),exclude(alternative_exports),exclude(fields)',
          limit: 5,
          offset: 0
        })
        .reply(200, mockResponse)

      const catalog = await listResources(config)
      assert.ok(catalog.count === mockResponse.total_count, 'the count should match the mock response')
      assert.ok(catalog.results.length === mockResponse.results.length, 'the results length should match the mock response')
      assert.deepEqual(catalog.results, [
        {
          id: 'dataset1',
          title: 'Mock Dataset 1',
          description: '',
          format: 'csv',
          origin: catalogConfig.url + '/explore/dataset/dataset1',
          type: 'resource'
        },
        {
          id: 'dataset2',
          title: 'Mock Dataset 2',
          description: 'This is a mock dataset for testing purposes.',
          format: 'csv',
          origin: catalogConfig.url + '/explore/dataset/dataset2',
          type: 'resource'
        },
        {
          id: 'dataset3',
          title: 'Mock Dataset 3',
          description: 'This is a mock dataset for testing purposes.',
          format: 'csv',
          origin: catalogConfig.url + '/explore/dataset/dataset3',
          type: 'resource'
        }
      ])
      assert.deepEqual(catalog.path, [], 'the path should be empty')
    })

    it('test the size and page parameters', async () => {
      const scope = nock(catalogConfig.url)
        .get('/api/explore/v2.1/catalog/datasets')
        .query({
          select: 'exclude(attachments),exclude(alternative_exports),exclude(fields)',
          limit: 10,
          offset: 40
        })
        .reply(200, { total_count: 0, results: [] })

      await listResources({
        ...config,
        params: { size: 10, page: 5 }
      })

      assert.ok(scope.isDone(), 'The request should be made with correct query parameters')
    })
  })

  describe('test the listResources function with a true configuration', () => {
    const catalogConfig: ODSConfig = {
      url: 'https://opendata.agenceore.fr'
    }
    const config: ListContext<ODSConfig, typeof capabilities> = {
      catalogConfig,
      params: { size: 10, page: 1 },
      secrets: {}
    }

    it('test listResources with a valid configuration', async () => {
      // requete correspondante à : https://opendata.agenceore.fr/api/explore/v2.1/catalog/datasets
      const catalog = await listResources(config)
      assert.ok(catalog.count === catalog.results.length || catalog.results.length === config.params.size, 'the count and the results length should match (or should reach the limit)')
      assert.ok(catalog.count > 0, 'it should have at least one result')
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
})
