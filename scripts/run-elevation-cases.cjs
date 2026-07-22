const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const protocol = require('../dist/service/env-conflict/elevation-protocol.js');

const root = path.join(process.cwd(), '.tmp-test', 'elevation-cases');
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });
const backupPath = path.join(root, 'backup');
fs.mkdirSync(backupPath, { recursive: true });
const base = {
  version: 1,
  operation: 'write-system-path',
  requestId: 'elevated-test-1',
  platform: 'linux',
  pathEntries: ['/opt/test/bin'],
  backupPath,
};

protocol.validateElevatedSystemPathRequest(base);
assert.equal(
  protocol.mergePathEntries('/usr/bin:/opt/test/bin', ['/opt/test/bin', '/opt/new/bin'], ':'),
  '/opt/test/bin:/opt/new/bin:/usr/bin'
);
assert.throws(
  () => protocol.validateElevatedSystemPathRequest({ ...base, unexpected: true }),
  /未授权字段/
);
assert.throws(
  () => protocol.validateElevatedSystemPathRequest({ ...base, operation: 'run-command' }),
  /白名单/
);
assert.throws(
  () =>
    protocol.validateElevatedSystemPathRequest({
      ...base,
      pathEntries: ['/tmp/evil\nexport BAD=1'],
    }),
  /控制字符|shell/
);
assert.throws(
  () => protocol.validateElevatedSystemPathRequest({ ...base, pathEntries: ['relative/bin'] }),
  /绝对路径/
);

const requestPath = path.join(root, 'request.json');
const resultPath = path.join(root, 'result.json');
const content = JSON.stringify(base, null, 2);
fs.writeFileSync(requestPath, content);
const hash = crypto.createHash('sha256').update(content).digest('hex');
const helper = path.join(process.cwd(), 'dist', 'service', 'env-conflict', 'elevation-helper.js');
const mismatch = spawnSync(process.execPath, [helper, requestPath, resultPath, hash], {
  encoding: 'utf8',
});
assert.equal(mismatch.status, 2);
assert.match(mismatch.stderr, /平台与助手平台不一致/);

fs.writeFileSync(requestPath, content.replace('/opt/test/bin', '/opt/tampered/bin'));
const tampered = spawnSync(process.execPath, [helper, requestPath, resultPath, hash], {
  encoding: 'utf8',
});
assert.equal(tampered.status, 2);
assert.match(tampered.stderr, /完整性校验失败/);

console.log(
  JSON.stringify(
    {
      validRequest: true,
      pathMerge: true,
      rejectsUnknownOperation: true,
      rejectsShellInjection: true,
      rejectsPlatformMismatch: true,
      rejectsRequestTampering: true,
      isolated: true,
    },
    null,
    2
  )
);
