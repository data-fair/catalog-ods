import type { ODSDataset, ODSConfig } from '#types'
import { logFunctions } from './test-utils.ts'
import type { Resource } from '@data-fair/types-catalogs'
import { strict as assert } from 'node:assert'
import { it, describe, afterEach, beforeEach } from 'node:test'
import { getResource } from '../lib/download.ts'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { Readable } from 'stream'
import nock from 'nock'

const catalogConfig: ODSConfig = {
  url: 'https://opendata.agenceore.fr'
}

describe('test the getResource function', () => {
  let tmpDir: string

  // Crée un dossier temporaire avant chaque test
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ods-test-'))
  })

  // Supprime le dossier temporaire après chaque test
  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('test getResource with a valid configuration', async () => {
    const res = await getResource({
      catalogConfig,
      resourceId: 'nombre-installation-production-stockage-electricite-31122017',
      secrets: {},
      importConfig: {},
      tmpDir,
      log: logFunctions
    })
    assert.ok(res)
    assert.strictEqual(res.id, 'nombre-installation-production-stockage-electricite-31122017')
    assert.strictEqual(res.title, 'Nombre d\'installations de production et de stockage d\'électricité de moins de 36kW par IRIS (au 31 décembre 2017)')
    assert.strictEqual(res.format, 'csv')
    assert.strictEqual(res.filePath, tmpDir + '/nombre-installation-production-stockage-electricite-31122017.csv')

    // Vérifie que le fichier existe
    const fileExists = await fs.stat(res.filePath).then(() => true, () => false)
    assert.ok(fileExists, 'Le fichier téléchargé doit exister')

    // Vérifie que la première ligne du fichier est correcte (en-têtes CSV)
    const content = await fs.readFile(res.filePath, 'utf8')
    const firstLine = content.slice(0, content.indexOf('\n'))
    assert.ok(firstLine.includes('codeiris'), 'La première ligne doit contenir un champ attendu (codeiris)')
  })

  it('test getResource with an invalid configuration (invalid url)', async () => {
    try {
      await getResource({
        catalogConfig: { url: 'https://example.com' },
        resourceId: 'nombre-installation-production-stockage-electricite-31122017',
        secrets: {},
        importConfig: {},
        tmpDir,
        log: logFunctions
      })
    } catch (error) {
      assert.ok(error instanceof Error, 'Error should be an instance of Error')
      return
    }
    assert.fail('Expected an error to be thrown for invalid catalogConfig')
  })

  it('test getResource with an invalid resource id', async () => {
    try {
      await getResource({
        catalogConfig,
        resourceId: 'test',
        secrets: {},
        importConfig: {},
        tmpDir,
        log: logFunctions
      })
    } catch (error) {
      assert.ok(error instanceof Error, 'Error should be an instance of Error')
      return
    }
    assert.fail('Expected an error to be thrown for invalid resourceId')
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
      }
    }

    nock(catalogMockConfig.url)
      .get(`/api/explore/v2.1/catalog/datasets/${resourceId}?select=exclude(features),exclude(attachments),exclude(alternative_exports),exclude(fields)`)
      .reply(200, mockMetaData)

    const resource = await getResource({
      catalogConfig: catalogMockConfig,
      resourceId,
      secrets: {},
      importConfig: {},
      tmpDir,
      log: logFunctions
    })

    const expectedResource: Resource = {
      id: 'example-id',
      title: 'example-title',
      filePath: tmpDir + '/' + resourceId + '.csv',
      format: 'csv',
      description: 'example-desc',
      keywords: ['one-keyword', 'second-keyword'],
      origin: catalogMockConfig.url + '/explore/dataset/' + resourceId,
      license: {
        title: 'example-license',
        href: 'example-license-url'
      }
    }
    assert.deepStrictEqual(resource, expectedResource)

    // Vérifie que le fichier existe
    const fileExists = await fs.stat(resource.filePath).then(() => true, () => false)
    assert.ok(fileExists, 'Le fichier téléchargé doit exister')

    // Vérifie que la première ligne du fichier est correcte (en-têtes CSV)
    const content = await fs.readFile(resource.filePath, 'utf8')
    assert.strictEqual(content, mockResponse)
  })
})
