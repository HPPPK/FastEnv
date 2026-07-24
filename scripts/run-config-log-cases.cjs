const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Logger } = require('../dist/service/logger/logger.js');
const { PersistenceManager } = require('../dist/service/storage/persistence.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-config-log-'));
try {
  const logsDir = path.join(root, 'logs');
  const logger = new Logger('debug', logsDir);
  logger.info('Test', 'config log info', { case: 'structured' });
  logger.warn('Test', 'config log warning');
  const logs = logger.getLogEntries(20);
  assert.equal(logs.length, 2);
  assert.equal(logs[0].level, 'warn');
  assert.deepEqual(logs[1].data, { case: 'structured' });

  const exportedLogs = path.join(root, 'exported.log');
  assert.equal(logger.exportLogs(exportedLogs), true);
  assert.match(fs.readFileSync(exportedLogs, 'utf8'), /config log info/);
  assert.equal(logger.clearLogs(), true);
  assert.equal(logger.getLogEntries(20).length, 0);

  const persistence = new PersistenceManager(path.join(root, 'data'), path.join(root, 'key'));
  const settings = {
    theme: 'dark',
    language: 'zh-CN',
    autoBackup: true,
    logLevel: 'info',
    mirrorPython: 'https://pypi.org/simple',
    mirrorNpm: 'https://registry.npmjs.org',
  };
  assert.equal(persistence.saveSettings(settings), true);
  assert.equal(persistence.saveEnvironments([]), true);
  assert.equal(persistence.saveRepairRecords([]), true);

  const exportedConfig = path.join(root, 'config.json');
  assert.equal(persistence.exportConfiguration(exportedConfig), true);
  assert.match(fs.readFileSync(exportedConfig, 'utf8'), /\"settings\"/);

  assert.equal(persistence.saveSettings({ ...settings, theme: 'light' }), true);
  assert.equal(persistence.importConfiguration(exportedConfig), true);
  assert.equal(persistence.loadSettings().theme, 'dark');

  const invalidConfig = path.join(root, 'invalid.json');
  fs.writeFileSync(invalidConfig, JSON.stringify({ settings: { theme: 'dark' } }));
  assert.equal(persistence.importConfiguration(invalidConfig), false);
  assert.equal(persistence.loadSettings().theme, 'dark');

  console.log('Configuration/log regression cases passed');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
