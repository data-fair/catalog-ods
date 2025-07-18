import { strict as assert } from 'node:assert'
import { test, before, after } from 'node:test'
import { downloadResource } from '../lib/download.ts'
import { tmpdir } from 'node:os'
import { mkdirSync, existsSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import type { GetResourceContext } from '@data-fair/types-catalogs'
import type { FiltresDeLImport } from '../types/importConfig/index.ts'
import type { ODSConfig } from '#types'
import { logFunctions } from './test-utils.ts'

const tmpDir = path.join(tmpdir(), 'ods-test')
const datasetId = 'nombre-installation-production-stockage-electricite-31122017'

const catalogConfig: ODSConfig = {
  url: 'https://opendata.agenceore.fr'
}

const constraints: FiltresDeLImport = [
  { field: { name: 'codedepartement', type: 'text' }, valeurs: [{ name: '56' }] }
]

const context: GetResourceContext<ODSConfig> = {
  catalogConfig,
  resourceId: datasetId,
  importConfig: { filters: constraints },
  tmpDir,
  secrets: {},
  log: logFunctions
}

before(() => {
  if (!existsSync(tmpDir)) mkdirSync(tmpDir)
})

after(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

test('should stream and write CSV file with valid constraints', async () => {
  const filePath = await downloadResource(context)
  assert.ok(filePath.endsWith('.csv'), 'File path should end with .csv')
  assert.ok(existsSync(filePath), 'File should exist')

  const content = readFileSync(filePath, 'utf-8')
  const rows = content.split('\n')
  assert.ok(rows.length > 1, 'CSV should contain multiple rows (including header)')
})

test('should throw for invalid datasetId', async () => {
  await assert.rejects(async () => {
    await downloadResource({ ...context, resourceId: 'invalid-dataset-id' })
  }, /Erreur pendant le téléchargement/, 'Expected error for invalid datasetId')
})

test('should throw for invalid catalog URL', async () => {
  await assert.rejects(async () => {
    await downloadResource({ ...context, catalogConfig: { url: 'https://example.com' } })
  }, /Erreur pendant le téléchargement/, 'Expected error for invalid catalog URL')
})

test('should throw for invalid constraint format (field name starting with digit)', async () => {
  const constraint: FiltresDeLImport = [
    { field: { name: '1badfield', type: 'text' }, valeurs: [{ name: 'test' }] }
  ]
  await assert.rejects(async () => {
    await downloadResource({ ...context, importConfig: { filters: constraint } })
  }, /Champ de filtrage invalide/, 'Expected validation error on constraint field name')
})
