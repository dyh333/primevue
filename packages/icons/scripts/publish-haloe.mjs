import { execSync } from 'child_process';
import { copyFileSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

// 检查是否为测试发布
const isTest = process.argv.includes('test');

// 生成6位随机字符串
function generateRandomString() {
    return Math.random().toString(36).substring(2, 8);
}

// 递归替换文件内容
function replaceInFiles(dirPath) {
    const files = readdirSync(dirPath);

    files.forEach((file) => {
        const fullPath = join(dirPath, file);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            replaceInFiles(fullPath);
        } else if (stat.isFile() && !file.endsWith('.json')) {
            let content = readFileSync(fullPath, 'utf-8');
            let hasChanges = false;

            // 替换完整的包引用路径，如"@primevue/icons/baseicon"
            if (content.includes('@primevue/icons/')) {
                content = content.replace(/@primevue\/icons\//g, '@haloe/icons/');
                hasChanges = true;
            }

            if (hasChanges) {
                writeFileSync(fullPath, content, 'utf-8');
                console.log(`已更新文件: ${fullPath}`);
            }
        }
    });
}

// 备份原始 package.json
const packageJsonPath = join(process.cwd(), 'package.json');
const backupPath = join(process.cwd(), 'package.json.backup');
copyFileSync(packageJsonPath, backupPath);

try {
    // 1. 修改 package.json
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    packageJson.name = '@haloe/icons';
    if (packageJson.dependencies && packageJson.dependencies['@primevue/core']) {
        packageJson.dependencies['@primevue/core'] = '4.3.1';
    }

    // 替换 @primeuix/utils 为 @haloe/utils
    if (packageJson.dependencies && packageJson.dependencies['@primeuix/utils']) {
        packageJson.dependencies['@primeuix/utils'] = '0.5.1';
    }

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // 2. 执行打包命令
    console.log('执行打包命令...');
    execSync('pnpm run build', { stdio: 'inherit' });

    const distPath = join(process.cwd(), 'dist');

    // 3. 替换 dist 目录下所有文件中的 @primeuix 引用
    console.log('替换文件中的包引用...');
    replaceInFiles(distPath);

    // 5. 读取 dist 目录下的 package.json
    const distPackagePath = join(distPath, 'package.json');
    const distPackageJson = JSON.parse(readFileSync(distPackagePath, 'utf-8'));

    // 将publishConfig中的配置项复制到dist的package.json根路径
    const originalPackageJson = JSON.parse(readFileSync(backupPath, 'utf-8'));
    if (originalPackageJson.publishConfig) {
        console.log('将publishConfig中的配置复制到dist/package.json根路径...');

        // 复制publishConfig中的各项配置到根路径
        const publishConfig = originalPackageJson.publishConfig;

        // 排除不需要复制的字段
        const excludeFields = ['directory', 'linkDirectory', 'access'];

        // 复制所有其他字段到根路径
        Object.keys(publishConfig).forEach((key) => {
            if (!excludeFields.includes(key)) {
                distPackageJson[key] = publishConfig[key];
                console.log(`  复制字段: ${key}`);
            }
        });
    }

    // 如果是测试发布，添加随机码到版本号
    if (isTest) {
        const randomCode = generateRandomString();
        distPackageJson.version = `${distPackageJson.version}-${randomCode}`;
        console.log(`发布测试版本: ${distPackageJson.version}`);
    }

    // 6. 写回 dist 的 package.json
    writeFileSync(distPackagePath, JSON.stringify(distPackageJson, null, 2));

    // 7. 执行发布命令
    console.log('执行发布命令...');
    execSync('pnpm publish --no-git-checks --registry=https://registry.npmjs.org/', {
        stdio: 'inherit',
        cwd: distPath
    });

    console.log('发布成功');
} catch (error) {
    console.error('发布过程中发生错误:', error);
} finally {
    // 8. 恢复原始 package.json
    copyFileSync(backupPath, packageJsonPath);
    unlinkSync(backupPath);
    console.log('已恢复原始 package.json');
}
