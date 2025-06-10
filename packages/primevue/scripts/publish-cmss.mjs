#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';

/**
 * PrimeVue发布脚本
 * 用法: 
 *   - 正式发布: node publish-cmss.mjs
 *   - 测试发布: node publish-cmss.mjs test (会在版本号后添加-随机字符)
 *   - 指定workspace路径: node publish-cmss.mjs --workspace-path <path>
 *   - 组合使用: node publish-cmss.mjs test --workspace-path <path>
 */

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 定义包路径
const packagePath = resolve(__dirname, '../');
const distPath = resolve(packagePath, 'dist');

// 检查是否为测试发布
const isTest = process.argv.includes('test');

// 检查是否指定了workspace路径
let specifiedWorkspacePath = null;
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === '--workspace-path' && i + 1 < process.argv.length) {
    specifiedWorkspacePath = process.argv[i + 1];
    break;
  }
}

// 生成6位随机字符串
function generateRandomString() {
  return Math.random().toString(36).substring(2, 8);
}

// 打印执行步骤信息的函数
function log(message) {
  console.log(`\x1b[36m${message}\x1b[0m`);
}

// 执行命令的函数
function exec(command, cwd = packagePath) {
  try {
    log(`执行命令: ${command}`);
    execSync(command, { stdio: 'inherit', cwd });
  } catch (error) {
    console.error(`\x1b[31m执行命令失败: ${command}\x1b[0m`);
    console.error(error);
    process.exit(1);
  }
}

// 递归遍历目录并处理所有.vue和.mjs文件
function processImportStatements(dir) {
  const files = readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      // 递归处理子目录
      processImportStatements(fullPath);
    } else if (file.endsWith('.vue') || file.endsWith('.mjs')) {
      // 处理.vue或.mjs文件
      let content = readFileSync(fullPath, 'utf8');
      
      // 替换import语句中的'primevue'为'@haloe/primevue'，但不替换'@primevue'
      let updatedContent = content.replace(
        /import\s+(?:.*\s+from\s+)?['"](?!@)primevue(\/[^'"]*)?['"]/g, 
        match => match.replace(/['"]primevue(\/[^'"]*)?['"]/, m => m.replace('primevue', '@haloe/primevue'))
      );
      // 替换import语句中的'@primeuix/styles'为'@haloe/styles'
      updatedContent = updatedContent.replace(
        /import\s+(?:.*\s+from\s+)?['"]@primeuix\/styles(\/[^'"]*)?['"]/g,
        match => match.replace(/['"]@primeuix\/styles(\/[^'"]*)?['"]/, m => m.replace('@primeuix/styles', '@haloe/styles'))
      );
      // 替换import语句中的'@primevue/icons'为'@haloe/icons'
      updatedContent = updatedContent.replace(
        /import\s+(?:.*\s+from\s+)?['"]@primevue\/icons(\/[^'"]*)?['"]/g,
        match => match.replace(/['"]@primevue\/icons(\/[^'"]*)?['"]/, m => m.replace('@primevue/icons', '@haloe/icons'))
      );
      
      if (content !== updatedContent) {
        log(`替换文件导入: ${fullPath}`);
        writeFileSync(fullPath, updatedContent, 'utf8');
      } else {
        log(`未替换文件: ${fullPath}`);
      }
    }
  });
}

// 主函数
async function main() {
  try {
    // 步骤1: 打包
    log('步骤1: 开始打包过程...');
    exec('pnpm run build');
    log('打包完成!');

    // 步骤2: 修改dist文件夹中的package.json中的name
    log('步骤2: 修改package.json中的name和导入publishConfig配置...');
    const distPackageJsonPath = resolve(distPath, 'package.json');
    const srcPackageJsonPath = resolve(packagePath, 'package.json');

    // 读取源目录下的package.json
    const srcPackageJson = JSON.parse(readFileSync(srcPackageJsonPath, 'utf8'));

    // 读取dist目录下的package.json
    const packageJson = JSON.parse(readFileSync(distPackageJsonPath, 'utf8'));

    // 修改name字段
    packageJson.name = '@haloe/primevue';

    // 从源package.json中的publishConfig复制配置到dist的package.json根级别
    // 从 publishConfig 复制字段
    if (srcPackageJson.publishConfig) {
      // 复制 main、module、types 字段
      packageJson.main = srcPackageJson.publishConfig.main;
      packageJson.module = srcPackageJson.publishConfig.module;
      packageJson.types = srcPackageJson.publishConfig.types;

      // 复制 exports 配置
      if (srcPackageJson.publishConfig.exports) {
        packageJson.exports = srcPackageJson.publishConfig.exports;
      }
    }

    // 读取pnpm-workspace.yaml，替换@primeuix开头的包的版本号
    log('替换依赖包的版本号...');
    try {
      // 首先检查命令行参数是否指定了workspace路径
      let workspaceYamlPath;
      if (specifiedWorkspacePath) {
        workspaceYamlPath = specifiedWorkspacePath;
        log(`使用命令行参数指定的workspace路径: ${workspaceYamlPath}`);
      } else if (process.env.WORKSPACE_ROOT) {
        // 其次检查环境变量中是否指定了workspace路径
        workspaceYamlPath = resolve(process.env.WORKSPACE_ROOT, 'pnpm-workspace.yaml');
        log(`使用环境变量指定的workspace路径: ${workspaceYamlPath}`);
      } else {
        // 查找项目根目录下的pnpm-workspace.yaml
        // 从当前目录向上查找，直到找到pnpm-workspace.yaml文件
        let workspaceRootDir = process.cwd();
        const rootMarkerFile = 'pnpm-workspace.yaml';
        let foundWorkspaceRoot = false;

        // 获取到的上级目录
        let prevDir = '';

        while (!foundWorkspaceRoot && workspaceRootDir !== prevDir) {
          const potentialPath = resolve(workspaceRootDir, rootMarkerFile);
          try {
            if (existsSync(potentialPath)) {
              foundWorkspaceRoot = true;
              break;
            }
          } catch (err) {
            // 忽略错误，继续向上查找
          }

          // 保存当前目录
          prevDir = workspaceRootDir;
          // 向上一级目录
          workspaceRootDir = resolve(workspaceRootDir, '..');
        }

        // 循环结束后，设置workspaceYamlPath
        if (foundWorkspaceRoot) {
          workspaceYamlPath = resolve(workspaceRootDir, rootMarkerFile);
          log(`找到workspace配置文件: ${workspaceYamlPath}`);
        } else {
          // 使用硬编码的路径作为备选
          workspaceYamlPath = 'D:/codes/primevue/pnpm-workspace.yaml';
          log(`未找到workspace配置文件，使用硬编码路径: ${workspaceYamlPath}`);
        }
      }

      // 在使用前确保workspaceYamlPath已定义
      if (!workspaceYamlPath) {
        throw new Error('无法确定pnpm-workspace.yaml的路径');
      }

      // 检查文件是否存在
      if (!existsSync(workspaceYamlPath)) {
        throw new Error(`文件不存在: ${workspaceYamlPath}`);
      }

      const workspaceYaml = parse(readFileSync(workspaceYamlPath, 'utf8'));

      if (workspaceYaml.catalog && packageJson.dependencies) {
        // 遍历dependencies中的所有包
        Object.keys(packageJson.dependencies).forEach(depName => {
          // 检查是否为@primeuix开头的包
          if (depName.startsWith('@primeuix/')) {
            // 从catalog中查找对应的版本号
            if (workspaceYaml.catalog[depName]) {
              const catalogVersion = workspaceYaml.catalog[depName];
              log(`替换依赖 ${depName} 的版本为 ${catalogVersion}`);
              packageJson.dependencies[depName] = catalogVersion;
            }
          }
          // 处理@primevue开头的包
          else if (depName.startsWith('@primevue/')) {
            // 将所有@primevue包使用固定版本号
            const fixedVersion = "4.3.3";
            log(`替换依赖 ${depName} 的版本为固定版本 ${fixedVersion}`);
            packageJson.dependencies[depName] = fixedVersion;
          }
        });
      }
    } catch (error) {
      log(`警告: 读取pnpm-workspace.yaml或处理依赖版本时出错: ${error.message}`);
    }

    // 如果是测试模式，在版本号后添加随机字符串
    if (isTest) {
      const randomString = generateRandomString();
      const originalVersion = packageJson.version;
      packageJson.version = `${originalVersion}-${randomString}`;
      log(`测试模式: 版本号修改为 ${packageJson.version}`);
    }

    // 步骤3: 保存修改后的package.json
    log('步骤3: 保存修改后的package.json...');
    writeFileSync(distPackageJsonPath, JSON.stringify(packageJson, null, 4), 'utf8');

    // 新添加的步骤4: 处理所有.vue和.mjs文件中的import语句
    log('步骤4: 替换所有.vue和.mjs文件中的import语句...');
    processImportStatements(distPath);
    log('import语句替换完成!');

    // 步骤5: 发布到npm
    log('步骤5: 发布到npm...');
    exec('pnpm publish --no-git-checks', distPath);
    log(`发布成功! 包名: @haloe/primevue@${packageJson.version}`);

  } catch (error) {
    console.error('\x1b[31m发布过程中出错:\x1b[0m', error);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\x1b[31m执行脚本出错:\x1b[0m', err);
  process.exit(1);
});