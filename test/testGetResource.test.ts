import type { ODSDataset, ODSConfig, ImportFilters, Attachments } from '#types'
import { logFunctions } from './test-utils.ts'
import type { Resource } from '@data-fair/types-catalogs'
import { strict as assert } from 'node:assert'
import { it, describe, afterEach, beforeEach } from 'node:test'
import { getResource } from '../lib/download.ts'
import fs from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { Readable } from 'stream'
import nock from 'nock'

describe('test the getResource function with mock config', () => {
  let tmpDir: string

  // Crée un dossier temporaire avant chaque test
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(tmpdir(), 'ods-test-'))
    nock.cleanAll() // Reset the mock before each test
  })

  // Supprime le dossier temporaire après chaque test
  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('test validity of data with mock function', async () => {
    // Mock response data
    const mockResponse = 'operateur;annee;filiere;code_categorie_consommation\n1;a;b;c\n2;a1;b1;c1\n3;a2;b2;c2\n4;a3;b3;c3'

    // Create a mock readable stream
    const mockStream = new Readable({
      read () { }
    })

    // Push the mock response data into the stream
    mockStream.push(mockResponse)
    mockStream.push(null) // Signal the end of the stream

    const catalogMockConfig: ODSConfig = {
      url: 'https://example.com',
      themes: []
    }
    const resourceId = 'example-id'
    nock(catalogMockConfig.url)
      .get(`/api/explore/v2.1/catalog/datasets/${resourceId}/exports/csv?select=*`)
      .reply(200, () => mockStream)

    const mockMetaData: ODSDataset = {
      dataset_id: resourceId,
      metas: {
        default: {
          title: 'example-title',
          description: 'example-desc',
          keyword: ['one-keyword', 'second-keyword'],
          license: 'example-license',
          license_url: 'example-license-url'
        }
      },
      features: ['analyse']
    }

    nock(catalogMockConfig.url)
      .get(`/api/explore/v2.1/catalog/datasets/${resourceId}`)
      .query({
        select: 'exclude(attachments),exclude(alternative_exports)'
      })
      .reply(200, mockMetaData)

    nock(catalogMockConfig.url)
      .get(`/api/explore/v2.1/catalog/datasets/${resourceId}/exports/csv`)
      .query({
        select: '*',
        compressed: true
      })
      .reply(200, () => mockStream)

    const resource = await getResource({
      catalogConfig: catalogMockConfig,
      resourceId,
      secrets: {},
      importConfig: { filters: [], attachments: [] },
      update: { metadata: true, schema: true },
      tmpDir,
      log: logFunctions
    })

    const expectedResource: Resource = {
      id: 'example-id',
      title: 'example-title',
      filePath: tmpDir + '/' + resourceId + '.csv.gz',
      format: 'csv',
      description: 'example-desc',
      keywords: ['one-keyword', 'second-keyword'],
      origin: catalogMockConfig.url + '/explore/dataset/' + resourceId,
      license: {
        title: 'example-license',
        href: 'example-license-url'
      },
      attachments: [],
      schema: undefined,
      topics: undefined
    }
    assert.deepEqual(resource, expectedResource)

    // Vérifie que le fichier existe
    const fileExists = await fs.stat(resource.filePath).then(() => true, () => false)
    assert.ok(fileExists, 'Le fichier téléchargé doit exister')

    // Vérifie que la première ligne du fichier est correcte (en-têtes CSV)
    const content = await fs.readFile(resource.filePath, 'utf8')
    assert.strictEqual(content, mockResponse)
  })

  it('should export x-refersTo for geo_point_2d fields in schema', async () => {
    const catalogMockConfig: ODSConfig = {
      url: 'https://example.com',
      themes: []
    }
    const resourceId = 'geo-point-example-id'
    const mockMetaData: ODSDataset = {
      dataset_id: resourceId,
      metas: {
        default: {
          title: 'Geo Point Example',
          description: 'Dataset with geo_point_2d field.',
        }
      },
      features: ['analyse', 'geo'],
      fields: [
        { name: 'location', type: 'geo_point_2d' },
        { name: 'other', type: 'text' }
      ]
    }

    nock(catalogMockConfig.url)
      .get(`/api/explore/v2.1/catalog/datasets/${resourceId}`)
      .query({
        select: 'exclude(attachments),exclude(alternative_exports)'
      })
      .reply(200, mockMetaData)

    nock(catalogMockConfig.url)
      .get(`/api/explore/v2.1/catalog/datasets/${resourceId}/exports/csv`)
      .query({
        select: '*',
        compressed: true
      })
      .reply(200, () => new Readable({
        read () { this.push(null) }
      }))

    const resource = await getResource({
      catalogConfig: catalogMockConfig,
      resourceId,
      secrets: {},
      importConfig: { filters: [], attachments: [] },
      update: { metadata: true, schema: true },
      tmpDir,
      log: logFunctions
    })

    assert.ok(resource.schema, 'Resource should have a schema')
    const geoField = resource.schema?.find(f => f.key === 'location')
    assert.ok(geoField, 'Schema should contain geo_point_2d field')
    assert.strictEqual(geoField?.['x-refersTo'], 'http://www.w3.org/2003/01/geo/wgs84_pos#lat_long', 'geo_point_2d should have correct x-refersTo')
  })

  it('should export x-refersTo for geo_shape fields in schema', async () => {
    const catalogMockConfig: ODSConfig = {
      url: 'https://example.com',
      themes: []
    }
    const resourceId = 'geo-shape-example-id'
    const mockMetaData: ODSDataset = {
      dataset_id: resourceId,
      metas: {
        default: {
          title: 'Geo Shape Example',
          description: 'Dataset with geo_shape field.',
        }
      },
      features: ['analyse', 'geo'],
      fields: [
        { name: 'geometry', type: 'geo_shape' },
        { name: 'other', type: 'text' }
      ]
    }

    nock(catalogMockConfig.url)
      .get(`/api/explore/v2.1/catalog/datasets/${resourceId}`)
      .query({
        select: 'exclude(attachments),exclude(alternative_exports)'
      })
      .reply(200, mockMetaData)

    nock(catalogMockConfig.url)
      .get(`/api/explore/v2.1/catalog/datasets/${resourceId}/exports/csv`)
      .query({
        select: '*',
        compressed: true
      })
      .reply(200, () => new Readable({
        read () { this.push(null) }
      }))

    const resource = await getResource({
      catalogConfig: catalogMockConfig,
      resourceId,
      secrets: {},
      importConfig: { filters: [], attachments: [] },
      update: { metadata: true, schema: true },
      tmpDir,
      log: logFunctions
    })

    assert.ok(resource.schema, 'Resource should have a schema')
    const geoField = resource.schema?.find(f => f.key === 'geometry')
    assert.ok(geoField, 'Schema should contain geo_shape field')
    assert.strictEqual(geoField?.['x-refersTo'], 'https://purl.org/geojson/vocab#geometry', 'geo_shape should have correct x-refersTo')
  })

  it('should not export x-refersTo for geo_point_2d if geo_shape is present', async () => {
    const catalogMockConfig: ODSConfig = {
      url: 'https://example.com',
      themes: []
    }
    const resourceId = 'geo-mixed-example-id'
    const mockMetaData: ODSDataset = {
      dataset_id: resourceId,
      metas: {
        default: {
          title: 'Geo Mixed Example',
          description: 'Dataset with geo_point_2d and geo_shape fields.',
        }
      },
      features: ['analyse', 'geo'],
      fields: [
        { name: 'location', type: 'geo_point_2d' },
        { name: 'geometry', type: 'geo_shape' }
      ]
    }

    nock(catalogMockConfig.url)
      .get(`/api/explore/v2.1/catalog/datasets/${resourceId}`)
      .query({
        select: 'exclude(attachments),exclude(alternative_exports)'
      })
      .reply(200, mockMetaData)

    nock(catalogMockConfig.url)
      .get(`/api/explore/v2.1/catalog/datasets/${resourceId}/exports/csv`)
      .query({
        select: '*',
        compressed: true
      })
      .reply(200, () => new Readable({
        read () { this.push(null) }
      }))

    const resource = await getResource({
      catalogConfig: catalogMockConfig,
      resourceId,
      secrets: {},
      importConfig: { filters: [], attachments: [] },
      update: { metadata: true, schema: true },
      tmpDir,
      log: logFunctions
    })

    assert.ok(resource.schema, 'Resource should have a schema')
    const geoPointField = resource.schema?.find(f => f.key === 'location')
    const geoShapeField = resource.schema?.find(f => f.key === 'geometry')
    assert.ok(geoPointField, 'Schema should contain geo_point_2d field')
    assert.ok(geoShapeField, 'Schema should contain geo_shape field')
    assert.strictEqual(geoPointField?.['x-refersTo'], undefined, 'geo_point_2d should not have x-refersTo if geo_shape is present')
    assert.strictEqual(geoShapeField?.['x-refersTo'], 'https://purl.org/geojson/vocab#geometry', 'geo_shape should have correct x-refersTo')
  })

  it('should query with the correct fields in the "where" clause when exporting a resource', async () => {
    const catalogMockConfig: ODSConfig = {
      url: 'https://example.com',
      themes: []
    }
    const importConfig: {
      filters: ImportFilters;
      attachments?: Attachments;
    } = {
      filters: [
        { field: { name: 'operateur', type: 'int' }, vals: [{ name: '1' }] },
        { field: { name: 'annee', type: 'text' }, vals: [{ name: 'a' }, { name: 'b' }] }
      ],
      attachments: []
    }
    const resourceId = 'fields-example-id'
    const mockMetaData: ODSDataset = {
      dataset_id: resourceId,
      metas: {
        default: {
          title: 'Fields Example',
        }
      },
      features: ['analyse']
    }
    nock(catalogMockConfig.url)
      .get(`/api/explore/v2.1/catalog/datasets/${resourceId}`)
      .query({
        select: 'exclude(attachments),exclude(alternative_exports)'
      })
      .reply(200, mockMetaData)

    const scope = nock(catalogMockConfig.url)
      .get(`/api/explore/v2.1/catalog/datasets/${resourceId}/exports/csv`)
      .query({
        select: '*',
        where: '(operateur = 1) and (annee = "a" or annee = "b")',
        compressed: true
      })
      .reply(200, () => new Readable({
        read () { this.push('operateur;annee\n1;a\n1;b'); this.push(null) }
      }))
    const resource = await getResource({
      catalogConfig: catalogMockConfig,
      resourceId,
      secrets: {},
      importConfig,
      update: { metadata: true, schema: true },
      tmpDir,
      log: logFunctions
    })

    // verifie que le nock a bien eté appelé avec les bons paramètres
    const expectedFilePath = path.join(tmpDir, `${resourceId}.csv.gz`)
    assert.strictEqual(resource.filePath, expectedFilePath, 'The resource file path should match the expected path')
    assert.ok(scope.isDone(), 'The request should be made with correct query parameters')
  })

  it('should exports the attachments if available', async () => {
    const catalogMockConfig: ODSConfig = {
      url: 'https://example.com',
      themes: []
    }
    const importConfig: { filters: ImportFilters, attachments: Attachments } = {
      filters: [],
      attachments: [{
        href: 'https://example.com/attachments/A1',
        metas: {
          id: 'A1',
          title: 'Attachment 1.pdf',
          mimetype: 'application/pdf',
          url: 'https://example.com/attachments/A1'
        },
      }, {
        href: 'https://example.com/attachments/A2',
        metas: {
          id: 'A2',
          title: 'Attachment 2.png',
          mimetype: 'image/png',
          url: 'https://example.com/attachments/A2'
        }
      }]
    }
    const resourceId = 'attachments-example-id'
    const mockMetaData: ODSDataset = {
      dataset_id: resourceId,
      metas: {
        default: {
          title: 'Attachments Example',
          description: 'This dataset has attachments.',
        }
      },
      features: ['analyse']
    }

    nock(catalogMockConfig.url)
      .get(`/api/explore/v2.1/catalog/datasets/${resourceId}`)
      .query({
        select: 'exclude(attachments),exclude(alternative_exports)'
      })
      .reply(200, mockMetaData)

    nock(catalogMockConfig.url)
      .get(`/api/explore/v2.1/catalog/datasets/${resourceId}/exports/csv`)
      .query({
        select: '*',
        compressed: true
      })
      .reply(200, () => new Readable({
        read () { this.push('operateur;annee;filiere;code_categorie_consommation\n1;a;b;c\n2;a1;b1;c1\n3;a2;b2;c2\n4;a3;b3;c3'); this.push(null) }
      }))

    nock(catalogMockConfig.url)
      .get('/attachments/A1')
      .reply(200, () => new Readable({
        read () { this.push('Attachment 1 content'); this.push(null) }
      }))

    nock(catalogMockConfig.url)
      .get('/attachments/A2')
      .reply(200, () => new Readable({
        read () { this.push('Attachment 2 content'); this.push(null) }
      }))

    const resource = await getResource({
      catalogConfig: catalogMockConfig,
      resourceId,
      secrets: {},
      importConfig,
      update: { metadata: true, schema: true },
      tmpDir,
      log: logFunctions
    })
    const expectedResource: Resource = {
      id: 'attachments-example-id',
      title: 'Attachments Example',
      filePath: path.join(tmpDir, `${resourceId}.csv.gz`),
      format: 'csv',
      description: 'This dataset has attachments.',
      keywords: [],
      schema: undefined,
      topics: undefined,
      origin: catalogMockConfig.url + '/explore/dataset/' + resourceId,
      attachments: [
        {
          title: 'Attachment 1.pdf',
          filePath: path.join(tmpDir, 'Attachment 1.pdf'),
        },
        {
          title: 'Attachment 2.png',
          filePath: path.join(tmpDir, 'Attachment 2.png'),
        }
      ]
    }
    assert.deepEqual(resource, expectedResource)

    assert.ok(resource.attachments && 'filePath' in resource.attachments[0] && resource.attachments[0].filePath, 'Attachment 1 file path should exist')
    assert.ok(resource.attachments && 'filePath' in resource.attachments[1] && resource.attachments[1].filePath, 'Attachment 2 file path should exist')
    assert.ok(await fs.readFile(resource.attachments[0].filePath, 'utf8').then(content => content === 'Attachment 1 content', () => false), 'Attachment 1 file content should match')
    assert.ok(await fs.readFile(resource.attachments[1].filePath, 'utf8').then(content => content === 'Attachment 2 content', () => false), 'Attachment 2 file content should match')
  })

  it('should binds the themes to the resource', async () => {
    const catalogMockConfig: ODSConfig = {
      url: 'https://example.com',
      themes: [
        { value: 'theme1', dataFairThemes: [{ title: 'Theme 1' }] },
        { value: 'theme2', dataFairThemes: [{ title: 'Theme 1' }, { title: 'Theme 2', id: 'theme2', color: '111', icon: { svg: '<svg></svg>' } }] },
        { value: 'theme3', dataFairThemes: [{ title: 'Theme 3' }] },
        { value: 'theme4', dataFairThemes: [] },
        { value: 'theme5', dataFairThemes: [{ title: 'Theme 5' }] }
      ]
    }

    nock(catalogMockConfig.url)
      .get('/api/explore/v2.1/catalog/datasets/example-id')
      .query({
        select: 'exclude(attachments),exclude(alternative_exports)'
      })
      .reply(200, {
        dataset_id: 'example-id',
        metas: {
          default: {
            title: 'Example Dataset',
            theme: ['theme1', 'theme2', 'theme3', 'theme4']
          }
        },
        features: ['analyse']
      })
    nock(catalogMockConfig.url)
      .get('/api/explore/v2.1/catalog/datasets/example-id/exports/csv')
      .query({
        select: '*',
        compressed: true
      })
      .reply(200, () => new Readable({
        read () { this.push('operateur;annee;filiere;code_categorie_consommation\n1;a;b;c\n2;a1;b1;c1\n3;a2;b2;c2\n4;a3;b3;c3'); this.push(null) }
      }))

    const resource = await getResource({
      catalogConfig: catalogMockConfig,
      resourceId: 'example-id',
      secrets: {},
      importConfig: { filters: [], attachments: [] },
      update: { metadata: true, schema: true },
      tmpDir,
      log: logFunctions
    })

    assert.ok(resource.topics, 'The resource should have topics')
    console.log(resource.topics)
    assert.strictEqual(resource.topics.length, 3, 'The resource should have 3 topics')
    assert.deepEqual(resource.topics, [
      { title: 'Theme 1' },
      { title: 'Theme 2', id: 'theme2', color: '111', icon: { svg: '<svg></svg>' } },
      { title: 'Theme 3' }
    ], 'The topics should match the expected themes')
  })

  it('should throw an error if the resourceId is invalid', async () => {
    const catalogMockConfig: ODSConfig = {
      url: 'https://example.com',
      themes: []
    }
    const invalidResourceId = 'invalid-id'
    nock(catalogMockConfig.url)
      .get(`/api/explore/v2.1/catalog/datasets/${invalidResourceId}`)
      .query({
        select: 'exclude(attachments),exclude(alternative_exports)'
      })
      .reply(404, { error: 'Dataset not found' })

    await assert.rejects(async () => {
      await getResource({
        catalogConfig: catalogMockConfig,
        resourceId: invalidResourceId,
        secrets: {},
        importConfig: { filters: [], attachments: [] },
        update: { metadata: true, schema: true },
        tmpDir,
        log: logFunctions
      })
    }, /Erreur lors de la récuperation de la resource ODS/i)
  })

  it('should set analysis.escapeKeyAlgorithm to "compat-ods" when compatODS is true', async () => {
    const catalogMockConfig: ODSConfig = {
      url: 'https://example.com',
      themes: []
    }
    const resourceId = 'compat-ods-example-id'
    const mockMetaData: ODSDataset = {
      dataset_id: resourceId,
      metas: {
        default: {
          title: 'Compat ODS Example',
          description: 'Dataset with compatODS enabled.',
        }
      },
      features: ['analyse']
    }

    nock(catalogMockConfig.url)
      .get(`/api/explore/v2.1/catalog/datasets/${resourceId}`)
      .query({
        select: 'exclude(attachments),exclude(alternative_exports)'
      })
      .reply(200, mockMetaData)

    nock(catalogMockConfig.url)
      .get(`/api/explore/v2.1/catalog/datasets/${resourceId}/exports/csv`)
      .query({
        select: '*',
        compressed: true
      })
      .reply(200, () => new Readable({
        read () { this.push('field1;field2\nvalue1;value2'); this.push(null) }
      }))

    const resource = await getResource({
      catalogConfig: catalogMockConfig,
      resourceId,
      secrets: {},
      importConfig: { filters: [], attachments: [], compatODS: true },
      update: { metadata: true, schema: true },
      tmpDir,
      log: logFunctions
    })

    assert.ok(resource.analysis, 'Resource should have analysis property')
    assert.strictEqual(resource.analysis.escapeKeyAlgorithm, 'compat-ods', 'escapeKeyAlgorithm should be "compat-ods"')
  })
})
