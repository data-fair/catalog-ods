import { strict as assert } from 'node:assert'
import { it, describe } from 'node:test'
import { safeFilePath } from '../lib/download.ts'

describe('safeFilePath', () => {
  it('keeps a plain file name inside the directory', () => {
    assert.equal(safeFilePath('/tmp/dir', 'file.pdf'), '/tmp/dir/file.pdf')
  })

  it('never traverses out of the directory', () => {
    assert.equal(safeFilePath('/tmp/dir', '../../etc/passwd'), '/tmp/dir/passwd')
    assert.equal(safeFilePath('/tmp/dir', 'a/../../b.csv.gz'), '/tmp/dir/b.csv.gz')
    assert.equal(safeFilePath('/tmp/dir', '/abs/path.txt'), '/tmp/dir/path.txt')
  })

  it('rejects names without a usable basename', () => {
    assert.throws(() => safeFilePath('/tmp/dir', '..'))
    assert.throws(() => safeFilePath('/tmp/dir', '.'))
    assert.throws(() => safeFilePath('/tmp/dir', ''))
    assert.throws(() => safeFilePath('/tmp/dir', '../'))
  })
})
