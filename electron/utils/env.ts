/**
 * Electron 环境工具
 * 判断开发/生产环境
 */

export const isDev = process.env.NODE_ENV === 'development';
export const isProd = process.env.NODE_ENV === 'production';

export function getAppPath(): string {
  return isDev ? process.cwd() : process.resourcesPath;
}
