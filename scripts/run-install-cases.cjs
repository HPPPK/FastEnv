const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const { EnvironmentInstaller } = require('../dist/service/env-install/env-installer.js');
const { DemandParser } = require('../dist/service/demand-parse/parser.js');
const { ConflictDetector } = require('../dist/service/env-conflict/detector.js');
const { EnvironmentCreator } = require('../dist/service/env-create/creator.js');
const {
  capturePlatformEnvironment,
  getPlatformEnvironmentTargets,
  restorePersistentPath,
  updatePersistentPath,
} = require('../dist/service/env-conflict/platform-backup.js');
const { getEnvironmentPermissionStatus } = require('../dist/service/env-conflict/permissions.js');

const projectRoot = path.resolve(__dirname, '..');
const tempRoot = path.join(projectRoot, '.tmp-test', 'install-cases');
const allowedRoot = path.join(projectRoot, '.tmp-test');
if (!tempRoot.startsWith(allowedRoot + path.sep)) {
  throw new Error('Refusing to clean a path outside the test workspace: ' + tempRoot);
}
fs.rmSync(tempRoot, { recursive: true, force: true });
fs.mkdirSync(tempRoot, { recursive: true });

function run(command, args, options) {
  const result = spawnSync(command, args, {
    cwd: options && options.cwd,
    encoding: 'utf8',
    shell: options && options.shell !== undefined ? options.shell : false,
    windowsHide: true,
  });
  return {
    command: [command].concat(args).join(' '),
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function envEntity(id, name, type, version, dependencies) {
  return {
    id,
    name,
    type,
    version,
    status: 'healthy',
    path: path.join(tempRoot, id),
    dependencies: dependencies || [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: [],
  };
}

async function main() {
  const report = {
    generatedAt: new Date().toISOString(),
    workspace: projectRoot,
    cases: [],
  };
  const installer = new EnvironmentInstaller();
  const npmCommand =
    execFileSync('where.exe', ['npm.cmd'], { encoding: 'utf8' })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || 'npm.cmd';

  const parser = new DemandParser();

  const darwinTargets = getPlatformEnvironmentTargets('darwin');
  const platformSnapshot = capturePlatformEnvironment();
  const macosProfileCoverage = [
    '.zshenv',
    '.zprofile',
    '.zshrc',
    '.bash_profile',
    '.bashrc',
    '.profile',
  ].every((profile) => darwinTargets.some((target) => target.target.endsWith(profile)));
  assert(macosProfileCoverage, 'macOS shell profile coverage is incomplete');
  report.platformBackup = {
    currentPlatform: platformSnapshot.platform,
    capturedSourceCount: platformSnapshot.sources.filter((source) => source.exists).length,
    macosTargets: darwinTargets.map((target) => target.target),
    verified: macosProfileCoverage && typeof platformSnapshot.processEnv === 'object',
  };

  const permissionStatus = getEnvironmentPermissionStatus();
  report.permissionPreflight = {
    platform: permissionStatus.platform,
    isElevated: permissionStatus.isElevated,
    userPathWritable: permissionStatus.userPath.writable,
    systemPathWritable: permissionStatus.systemPath.writable,
    verified:
      typeof permissionStatus.userPath.target === 'string' &&
      permissionStatus.systemPath.requiresElevation,
  };

  const shellProfileFixture = path.join(tempRoot, 'macos-shell-profile.fixture');
  const shellProfileChange = updatePersistentPath(
    {
      kind: 'shell-profile',
      target: shellProfileFixture,
      exists: false,
      value: '',
    },
    '/usr/local/bin:/usr/bin',
    tempRoot
  );
  const fixtureWritten = fs
    .readFileSync(shellProfileFixture, 'utf8')
    .includes('EnvGuard managed PATH');
  restorePersistentPath(shellProfileChange);
  const fixtureRestored = !fs.existsSync(shellProfileFixture);
  assert(fixtureWritten && fixtureRestored, 'Shell profile transaction rollback failed');
  report.platformBackup.transactionVerified = fixtureWritten && fixtureRestored;

  const demandCases = [
    {
      name: 'Python Django Web API',
      text: 'Python 3.12 Django Web API，安装 requests 和 pytest',
    },
    {
      name: 'Node React TypeScript Vite',
      text: 'Node.js 20 React TypeScript Vite frontend，使用 axios',
    },
    {
      name: 'Java Spring Boot API',
      text: 'Java 17 Spring Boot REST API with Maven, MySQL and JUnit',
    },
    {
      name: 'Python + Node full stack',
      text: 'Python 3.12 FastAPI backend plus Node.js 20 React frontend',
    },
  ];
  report.demandParsing = demandCases.map((item) => ({
    name: item.name,
    result: parser.parseText(item.text),
  }));

  const pythonEnv = path.join(tempRoot, 'python-success');
  const pythonCommand =
    execFileSync('where.exe', ['python'], { encoding: 'utf8' })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !line.toLowerCase().includes('windowsapps')) || 'python';
  const venvResult = run(pythonCommand, ['-m', 'venv', pythonEnv]);
  assert(venvResult.status === 0, 'Python venv creation failed: ' + venvResult.stderr);
  const pythonProgress = [];
  const pythonInstall = await installer.installPackages({
    environmentPath: pythonEnv,
    environmentType: 'python',
    packages: ['colorama==0.4.6'],
    onProgress: (event) => pythonProgress.push(event),
  });
  const pythonInstalled = await installer.getInstalledPackages(pythonEnv, 'python');
  report.cases.push({
    name: '真实 Python 安装成功',
    environmentPath: pythonEnv,
    command: pythonCommand + ' -m venv <isolated-dir> && pip install colorama==0.4.6',
    result: pythonInstall,
    progress: pythonProgress,
    verified:
      pythonInstall.success &&
      pythonInstalled.some((pkg) => pkg.toLowerCase().startsWith('colorama==')),
    installedPackages: pythonInstalled.filter((pkg) => pkg.toLowerCase().startsWith('colorama==')),
  });

  const creator = new EnvironmentCreator();
  const createdDependencyEnv = path.join(tempRoot, 'python-create-with-dependency');
  const createProgress = [];
  const createdEnvironment = await creator.createEnvironment(
    'fastenv-create-with-dependency',
    'python',
    'latest',
    createdDependencyEnv,
    ['colorama==0.4.6'],
    {
      operationId: 'create-with-dependency-regression',
      onProgress: (event) => createProgress.push(event),
    }
  );
  const createdPythonPath = path.join(createdDependencyEnv, 'Scripts', 'python.exe');
  const createdDependencyPackages = await installer.getInstalledPackages(
    createdDependencyEnv,
    'python'
  );
  const createdDependencyVerified =
    createdEnvironment.dependencies.some(
      (dependency) => dependency.name.toLowerCase() === 'colorama' && dependency.version === '0.4.6'
    ) &&
    createdDependencyPackages.some((pkg) => pkg.toLowerCase() === 'colorama==0.4.6') &&
    fs.existsSync(createdPythonPath);
  assert(
    createdDependencyVerified,
    'EnvironmentCreator did not install colorama into the Windows venv Scripts path'
  );
  report.cases.push({
    name: '创建 Python 环境并附带安装依赖',
    environmentPath: createdDependencyEnv,
    command: 'EnvironmentCreator.createEnvironment(..., [colorama==0.4.6])',
    result: {
      success: true,
      environment: createdEnvironment,
    },
    progress: createProgress,
    verified: createdDependencyVerified,
    pythonPath: createdPythonPath,
    installedPackages: createdDependencyPackages.filter((pkg) =>
      pkg.toLowerCase().startsWith('colorama==')
    ),
  });

  const nodeEnv = path.join(tempRoot, 'node-success');
  fs.mkdirSync(nodeEnv, { recursive: true });
  fs.writeFileSync(
    path.join(nodeEnv, 'package.json'),
    JSON.stringify(
      {
        name: 'fastenv-node-success-case',
        version: '1.0.0',
        private: true,
      },
      null,
      2
    )
  );
  const nodeProgress = [];
  const nodeInstall = await installer.installPackages({
    environmentPath: nodeEnv,
    environmentType: 'node',
    packages: ['is-number@7.0.0'],
    onProgress: (event) => nodeProgress.push(event),
  });
  const nodeInstalled = await installer.getInstalledPackages(nodeEnv, 'node');
  report.cases.push({
    name: '真实 Node 安装成功',
    environmentPath: nodeEnv,
    command: 'npm install is-number@7.0.0',
    result: nodeInstall,
    progress: nodeProgress,
    verified: nodeInstall.success && nodeInstalled.includes('is-number'),
    installedPackages: nodeInstalled,
  });

  const pythonConflictEnv = path.join(tempRoot, 'python-conflict');
  const conflictVenvResult = run(pythonCommand, ['-m', 'venv', pythonConflictEnv]);
  assert(
    conflictVenvResult.status === 0,
    'Python conflict venv creation failed: ' + conflictVenvResult.stderr
  );
  const pipPath = path.join(pythonConflictEnv, 'Scripts', 'pip.exe');
  const pythonConflict = run(
    pipPath,
    ['install', 'requests==2.28.0', 'requests==2.31.0', '--disable-pip-version-check'],
    { cwd: pythonConflictEnv }
  );
  report.cases.push({
    name: '真实 Python 版本冲突',
    environmentPath: pythonConflictEnv,
    command: 'pip install requests==2.28.0 requests==2.31.0',
    exitCode: pythonConflict.status,
    conflictDetected:
      pythonConflict.status !== 0 &&
      /ResolutionImpossible|conflict|different versions/i.test(
        pythonConflict.stdout + pythonConflict.stderr
      ),
    output: (pythonConflict.stdout + '\n' + pythonConflict.stderr).slice(-5000),
  });

  const nodeConflictEnv = path.join(tempRoot, 'node-conflict');
  fs.mkdirSync(nodeConflictEnv, { recursive: true });
  fs.writeFileSync(
    path.join(nodeConflictEnv, 'package.json'),
    JSON.stringify(
      {
        name: 'fastenv-node-conflict-case',
        version: '1.0.0',
        private: true,
      },
      null,
      2
    )
  );
  const nodeConflict = run(
    process.env.ComSpec || 'cmd.exe',
    ['/d', '/s', '/c', 'npm.cmd install react@17.0.2 react-dom@18.2.0 --no-audit --no-fund'],
    { cwd: nodeConflictEnv }
  );
  report.cases.push({
    name: '真实 Node peer dependency 冲突',
    environmentPath: nodeConflictEnv,
    command: 'npm install react@17.0.2 react-dom@18.2.0',
    exitCode: nodeConflict.status,
    conflictDetected:
      nodeConflict.status !== 0 &&
      /ERESOLVE|peer dependency|peer dep/i.test(nodeConflict.stdout + nodeConflict.stderr),
    output: (nodeConflict.stdout + '\n' + nodeConflict.stderr).slice(-5000),
  });

  const duplicatePath = path.join(tempRoot, 'duplicate-bin');
  const syntheticEnvironments = [
    envEntity('python-311', 'Python 3.11', 'python', '3.11', [
      { name: 'numpy', version: '1.26.0' },
      { name: 'numpy', version: '2.0.0' },
    ]),
    envEntity('python-312', 'Python 3.12', 'python', '3.12', []),
  ];
  const syntheticScan = {
    id: 'synthetic-scan',
    timestamp: Date.now(),
    platform: 'win32',
    environments: syntheticEnvironments,
    installedTools: [],
    pathEntries: [
      { index: 0, path: duplicatePath, priority: 0, tools: [], isDuplicate: false, isValid: true },
      { index: 1, path: duplicatePath, priority: 1, tools: [], isDuplicate: true, isValid: true },
    ],
    systemVariables: [],
    totalEnvironments: 2,
    healthyCount: 2,
    warningCount: 0,
    errorCount: 0,
  };
  const syntheticConflicts = new ConflictDetector().detectConflicts(
    syntheticEnvironments,
    syntheticScan
  );
  report.syntheticConflictDetection = {
    conflictTypes: syntheticConflicts.map((conflict) => conflict.type),
    conflicts: syntheticConflicts,
    verified:
      syntheticConflicts.some((conflict) => conflict.type === 'version_mismatch') &&
      syntheticConflicts.some((conflict) => conflict.type === 'dependency_conflict'),
  };

  const reportPath = path.join(tempRoot, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        reportPath,
        demandParsing: report.demandParsing.map((item) => ({
          name: item.name,
          detectedTypes: item.result.detectedTypes,
          versions: item.result.versions,
          dependencies: item.result.dependencies,
        })),
        cases: report.cases.map((item) => ({
          name: item.name,
          success: item.result ? item.result.success : undefined,
          verified: item.verified,
          conflictDetected: item.conflictDetected,
          exitCode: item.exitCode,
        })),
        syntheticConflictDetection: report.syntheticConflictDetection,
        platformBackup: report.platformBackup,
        permissionPreflight: report.permissionPreflight,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
