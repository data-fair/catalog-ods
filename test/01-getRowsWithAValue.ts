/* eslint-disable */

import { type ODSConfig } from '#types'
import { strict as assert } from 'node:assert'
import { it, describe } from 'node:test'
import { getRowsWithAValue } from '../lib/download.ts'
import { type FiltresDeLImport } from '../types/importConfig/index.ts'

const catalogConfig: ODSConfig = {
  url: 'https://opendata.agenceore.fr'
}

const datasetId = 'nombre-installation-production-stockage-electricite-31122017'

const constraints =
  [{ field: { name: 'codedepartement', type: 'text' }, valeurs: [{ name: '56' }] }]



describe('test the getRowsWithAValue function', () => {

  it('test getRowsWithAValue with a valid dataset and constraints', async () => {
    const rowsStr = await getRowsWithAValue(catalogConfig, datasetId, constraints)
    const rows = rowsStr.split('\n')
    assert.ok(Array.isArray(rows), 'Rows should be an array')
    assert.ok(rows.length > 1, 'Rows array should not be empty')
  });

  it('test the downloadResource with constraint with no rows', async () => {
    const constraint: FiltresDeLImport = [{ field: { name: 'codedepartement', type: 'text' }, valeurs: [{ name: '99999' }] }]
    const rowsStr = await getRowsWithAValue(catalogConfig, datasetId, constraint)
    const rows = rowsStr.split('\r\n')
    assert.ok(Array.isArray(rows), 'Rows should be an array')
    assert.ok(rows.length == 1 || rows[1] === '', 'Rows array should be empty') // 1 pour le header du csv + 1 pour un fin de ligne

  });

  it('test getRowsWithAValue with a catalog config', async () => {
    try {
      await getRowsWithAValue({ url: 'https://example.com' }, datasetId, constraints)
    } catch (error) {
      assert.ok(error instanceof Error, 'Error should be an instance of Error')
      return;
    }
    assert.fail('Expected an error to be thrown for invalid datasetId');
  });

  it('test getRowsWithAValue with a invalid dataset', async () => {
    try {
      await getRowsWithAValue(catalogConfig, 'invalid-dataset-id', constraints)
    } catch (error) {
      assert.ok(error instanceof Error, 'Error should be an instance of Error')
      return;
    }
    assert.fail('Expected an error to be thrown for invalid datasetId');
  });

  it('test getRowsWithAValue with invalid constraints', async () => {
    try {
      const constraint = [{ field: { name: 'invalid_field', type: 'text' }, valeurs: [{ name: '9999' }] }]
      await getRowsWithAValue(catalogConfig, datasetId, constraint)
    } catch (error) {
      assert.ok(error instanceof Error, 'Error should be an instance of Error')
      return;
    }
    assert.fail('Expected an error to be thrown for invalid constraints');
  });

  it('test getRowsWithAValue with invalid constraint format', async () => {
    try {
      const constraint = [{ field: { name: '1_test', type: 'text' }, valeurs: [{ name: '9999' }] }]
      await getRowsWithAValue(catalogConfig, datasetId, constraint)
    } catch (error) {
      assert.ok(error instanceof Error, 'Error should be an instance of Error')
      return;
    }
    assert.fail('Expected an error to be thrown for invalid constraints');
  });

});
