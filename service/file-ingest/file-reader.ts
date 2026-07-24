import * as fs from 'fs';
import * as path from 'path';

export const SUPPORTED_REQUIREMENT_EXTENSIONS = ['.txt', '.md', '.json', '.log'] as const;
export const MAX_REQUIREMENT_FILE_SIZE = 10 * 1024 * 1024;

export interface RequirementFile {
  filePath: string;
  fileName: string;
  extension: string;
  content: string;
  size: number;
}

export function isSupportedRequirementFile(filePath: string): boolean {
  return (SUPPORTED_REQUIREMENT_EXTENSIONS as readonly string[]).includes(path.extname(filePath).toLowerCase());
}

export class FileReaderService {
  readRequirementFile(filePath: string): RequirementFile {
    const absolutePath = path.resolve(filePath);
    if (!isSupportedRequirementFile(absolutePath)) {
      throw new Error('仅支持 TXT、MD、JSON 和 LOG 文本文件；PDF/DOCX 解析尚未接入');
    }
    const stats = fs.statSync(absolutePath);
    if (!stats.isFile()) throw new Error('选择的路径不是文件');
    if (stats.size > MAX_REQUIREMENT_FILE_SIZE) throw new Error('需求文件不能超过 10 MB');
    return {
      filePath: absolutePath,
      fileName: path.basename(absolutePath),
      extension: path.extname(absolutePath).toLowerCase(),
      content: fs.readFileSync(absolutePath, 'utf8'),
      size: stats.size,
    };
  }
}

export const fileReaderService = new FileReaderService();
