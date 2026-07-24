const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { FileReaderService, MAX_REQUIREMENT_FILE_SIZE } = require('../dist/service/file-ingest/file-reader.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-file-ingest-'));
try {
  const reader = new FileReaderService();
  const textPath = path.join(root, 'requirements.md');
  fs.writeFileSync(textPath, '# Python API\nDjango 5 and pytest', 'utf8');
  const result = reader.readRequirementFile(textPath);
  assert.equal(result.fileName, 'requirements.md');
  assert.match(result.content, /Django 5/);

  assert.throws(() => reader.readRequirementFile(path.join(root, 'requirements.pdf')), /仅支持/);
  const tooLargePath = path.join(root, 'too-large.txt');
  const handle = fs.openSync(tooLargePath, 'w');
  fs.ftruncateSync(handle, MAX_REQUIREMENT_FILE_SIZE + 1);
  fs.closeSync(handle);
  assert.throws(() => reader.readRequirementFile(tooLargePath), /10 MB/);
  console.log('File ingestion regression cases passed');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
