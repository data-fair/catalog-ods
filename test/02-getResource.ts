/* eslint-disable */

import { type ODSConfig } from '#types'
import { strict as assert } from 'node:assert'
import { it, describe } from 'node:test'
import { getResource } from '../lib/imports.ts'

const catalogConfig: ODSConfig = {
  url: 'https://opendata.agenceore.fr'
}

describe('test the getResource function', () => {

  it('test getResource with a valid configuration', async () => {
    // requete correspondante à : https://opendata.agenceore.fr/api/explore/v2.1/catalog/datasets
    const res = await getResource({ catalogConfig, resourceId: 'registre-national-installation-production-stockage-electricite-agrege-311221', secrets: {} })
    assert.ok(res.id, 'registre-national-installation-production-stockage-electricite-agrege-311221')
    assert.ok(res.title, 'Registre national des installations de production et de stockage d\'électricité (au 31/12/2021)')
  });

  it('test getResource with an invalid configuration (invalid url)', async () => {
    try {
      await getResource({ catalogConfig: { url: 'https://example.com' }, resourceId: 'registre-national-installation-production-stockage-electricite-agrege-311221', secrets: {} })
    } catch (error) {
      assert.ok(error instanceof Error, 'Error should be an instance of Error')
      return;
    }
    assert.fail('Expected an error to be thrown for invalid catalogConfig');
  });

  it('test getResource with an invalid resource id', async () => {
    try {
      await getResource({ catalogConfig, resourceId: 'test', secrets: {} })
    } catch (error) {
      assert.ok(error instanceof Error, 'Error should be an instance of Error')
      return;
    }
    assert.fail('Expected an error to be thrown for invalid resourceId');
  });
});
