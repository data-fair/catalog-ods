/* eslint-disable */

import { type ODSConfig } from '#types'
import { strict as assert } from 'node:assert'
import { it, describe, afterEach, beforeEach } from 'node:test'
import { getResource } from '../lib/download.ts'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

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
      resourceId: 'registre-national-installation-production-stockage-electricite-agrege-311221',
      secrets: {},
      importConfig: {},
      tmpDir
    })
    assert.ok(res)
    assert.strictEqual(res.id, 'registre-national-installation-production-stockage-electricite-agrege-311221')
    assert.strictEqual(res.title, 'Registre national des installations de production et de stockage d\'électricité (au 31/12/2021)')
    assert.strictEqual(res.format, 'csv')
    assert.strictEqual(res.filePath, tmpDir+ '/registre-national-installation-production-stockage-electricite-agrege-311221.csv')

    // Vérifie que le fichier existe
    const fileExists = await fs.stat(res.filePath).then(() => true, () => false)
    assert.ok(fileExists, 'Le fichier téléchargé doit exister')

    // Vérifie que la première ligne du fichier est correcte (en-têtes CSV)
    const content = await fs.readFile(res.filePath, 'utf8')
    const firstLine = content.split('\n')[0]
    assert.ok(firstLine.includes('nominstallation'), 'La première ligne doit contenir un champ attendu (nominstallation)')
  })

  it('test getResource with an invalid configuration (invalid url)', async () => {
    try {
      await getResource({
        catalogConfig: { url: 'https://example.com' },
        resourceId: 'registre-national-installation-production-stockage-electricite-agrege-311221',
        secrets: {},
        importConfig: {},
        tmpDir
      })
    } catch (error) {
      assert.ok(error instanceof Error, 'Error should be an instance of Error')
      return;
    }
    assert.fail('Expected an error to be thrown for invalid catalogConfig');
  })

  it('test getResource with an invalid resource id', async () => {
    try {
      await getResource({
        catalogConfig,
        resourceId: 'test',
        secrets: {},
        importConfig: {},
        tmpDir
      })
    } catch (error) {
      assert.ok(error instanceof Error, 'Error should be an instance of Error')
      return;
    }
    assert.fail('Expected an error to be thrown for invalid resourceId');
  })
})
