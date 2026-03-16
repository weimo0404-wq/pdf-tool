# PDF 批量处理工具

一个基于 Next.js 16 构建的 PDF 批量处理工具，支持去除水印、转换为图片、批量下载。

## 功能特性

- **批量上传**：支持一次上传多个 PDF 文件
- **智能去水印**：多种检测策略，自动识别并移除水印
- **高清转换**：将 PDF 每页转换为 2 倍分辨率的 PNG 图片
- **便捷下载**：打包为 ZIP 文件，每个 PDF 对应独立文件夹
- **规范命名**：图片格式为 `PDF文件名_01.png`、`PDF文件名_02.png` 等
- **示例文件**：内置 3 个示例 PDF 快速体验功能

## 技术栈

- **框架**：Next.js 16 (App Router)
- **UI 组件**：shadcn/ui + Tailwind CSS
- **PDF 处理**：pdf.js (渲染) + Canvas API (水印处理)
- **文件打包**：JSZip

## 本地开发

### 环境要求

- Node.js 18+
- pnpm 9+

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/你的用户名/pdf-tool.git
cd pdf-tool

# 2. 安装依赖（必须使用 pnpm）
pnpm install

# 3. 启动开发服务器
pnpm dev

# 4. 访问 http://localhost:5000
```

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 部署到 Vercel

### 方法一：通过 GitHub（推荐）

1. 将项目推送到 GitHub
2. 访问 [vercel.com](https://vercel.com)
3. 使用 GitHub 登录
4. 点击 "New Project" → Import 你的 GitHub 仓库
5. 点击 "Deploy"，等待部署完成

### 方法二：通过 Vercel CLI

```bash
# 安装 Vercel CLI
pnpm add -g vercel

# 登录并部署
vercel login
vercel --prod
```

## 使用说明

1. 点击"选择 PDF 文件"上传一个或多个 PDF
2. 或点击"加载示例文件"快速体验
3. 点击"开始处理并下载"
4. 系统自动处理并下载 ZIP 压缩包
5. 解压后每个 PDF 对应一个文件夹

## 项目结构

```
├── src/
│   ├── app/
│   │   ├── page.tsx          # 主页面
│   │   ├── layout.tsx        # 布局
│   │   └── globals.css       # 全局样式
│   └── components/ui/        # UI 组件
├── public/
│   ├── logo.png              # Logo
│   └── pdf.worker.min.mjs    # PDF.js worker
└── package.json
```

## 作者

未末创建的小工具

## License

MIT
