const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { writeSystemPathWithElevation } = require('../dist/service/env-conflict/elevation.js');

const registryTarget = 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment';
function readSystemPath() {
  const output = execFileSync(
    'C:\\Windows\\System32\\reg.exe',
    ['query', registryTarget, '/v', 'Path'],
    {
      encoding: 'utf8',
      windowsHide: true,
    }
  );
  const match = output.match(/^\s*Path\s+REG_\S+\s+(.*)$/im);
  if (!match) throw new Error('无法读取 HKLM 系统 PATH');
  return match[1].trim();
}

const before = readSystemPath();
const firstEntry = before
  .split(';')
  .map((entry) => entry.trim())
  .find(Boolean);
if (!firstEntry) throw new Error('HKLM 系统 PATH 没有可用于无净变化验证的条目');
console.log(JSON.stringify({ stage: 'before', firstEntry, pathLength: before.length }));

(async () => {
  const result = await writeSystemPathWithElevation([firstEntry]);
  const after = readSystemPath();
  const unchanged = after === before;
  console.log(JSON.stringify({ result, unchanged, afterLength: after.length }, null, 2));

  if (!result.success) process.exitCode = result.cancelled ? 2 : 1;
  else assert.equal(unchanged, true, '本次真实系统级写入不应改变 PATH 内容');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
