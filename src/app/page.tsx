'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  FileUp, 
  Download, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  FileText,
  Trash2,
  FolderOpen
} from 'lucide-react';
import JSZip from 'jszip';

interface PDFFile {
  file: File;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  pageCount?: number;
  error?: string;
}

export default function Home() {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [showExampleFiles, setShowExampleFiles] = useState(true);

  const exampleFiles = [
    {
      name: '第0节 开班典礼',
      url: 'https://coze-coding-project.tos.coze.site/create_attachment/2026-03-16/2913052805040515_8076e8ff9711c5c8c1ee575f11e922cb_%E7%AC%AC0%E8%8A%82%20%E5%BC%80%E7%8F%AD%E5%85%B8%E7%A4%BC.pdf?sign=4895726785-7ae02dd211-0-9821fb93d2ba21c3ef5556c4128f5ea8f74313f8e646b2a08421fa8e1aeaa32d'
    },
    {
      name: '第1节 提示词和RAG',
      url: 'https://coze-coding-project.tos.coze.site/create_attachment/2026-03-16/2913052805040515_87575518a8bf61b18828a4c6c8f32baa_%E7%AC%AC1%E8%8A%82%20%E6%8F%90%E7%A4%BA%E8%AF%8D%E5%92%8CRAG.pdf?sign=4895726785-0cdcc69fbd-0-2b7291722a1fdb4b9fd21e0f4fc8b93142cb41a2da6ea455eddd52c3355fbffc'
    },
    {
      name: '第2节 Agent',
      url: 'https://coze-coding-project.tos.coze.site/create_attachment/2026-03-16/2913052805040515_b56bed020feee5f1d01eab3f3eaf7dbd_%E7%AC%AC2%E8%8A%82%20Agent.pdf?sign=4895726785-1f86b0baeb-0-1ee89687a9b083731c8f5196bdf81105bb881ae26c00e288370d1f0e70a119d9'
    }
  ];

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      file => file.type === 'application/pdf'
    );
    
    if (files.length === 0) return;

    const newFiles: PDFFile[] = files.map(file => ({
      file,
      name: file.name.replace('.pdf', ''),
      status: 'pending',
      progress: 0
    }));

    // 上传新文件时，清空已完成的文件，保留等待处理和处理中的文件
    setPdfFiles(prev => {
      const pendingFiles = prev.filter(f => f.status === 'pending' || f.status === 'processing');
      return [...pendingFiles, ...newFiles];
    });
    e.target.value = '';
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleLoadExample = useCallback(async () => {
    setIsProcessing(true);
    setCurrentTask('正在加载示例文件...');
    
    try {
      const files: PDFFile[] = [];
      
      for (const example of exampleFiles) {
        try {
          const response = await fetch(example.url);
          const blob = await response.blob();
          const file = new File([blob], `${example.name}.pdf`, { type: 'application/pdf' });
          
          files.push({
            file,
            name: example.name,
            status: 'pending',
            progress: 0
          });
        } catch (error) {
          console.error(`加载示例文件 ${example.name} 失败:`, error);
        }
      }
      
      if (files.length > 0) {
        // 加载示例文件时，清空已完成的文件
        setPdfFiles(prev => {
          const pendingFiles = prev.filter(f => f.status === 'pending' || f.status === 'processing');
          return [...pendingFiles, ...files];
        });
        setShowExampleFiles(false);
      }
      
    } catch (error) {
      console.error('加载示例文件失败:', error);
    } finally {
      setIsProcessing(false);
      setCurrentTask('');
    }
  }, []);

  const handleClearAll = useCallback(() => {
    setPdfFiles([]);
    setGlobalProgress(0);
    setCurrentTask('');
  }, []);

  const processPDFs = async () => {
    if (pdfFiles.length === 0) return;
    
    setIsProcessing(true);
    setGlobalProgress(0);
    
    try {
      // 使用 pdfjs-dist 的 legacy 版本以获得更好的兼容性
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      
      // 使用本地的 worker 文件
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const zip = new JSZip();
      const totalFiles = pdfFiles.length;
      let completedFiles = 0;
      
      for (let i = 0; i < pdfFiles.length; i++) {
        const pdfFile = pdfFiles[i];
        
        setPdfFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'processing', progress: 0 } : f
        ));
        
        setCurrentTask(`正在处理: ${pdfFile.name}`);
        
        try {
          // 读取PDF文件
          const arrayBuffer = await pdfFile.file.arrayBuffer();
          
          // 使用 pdf.js 加载 PDF
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const numPages = pdf.numPages;
          
          // 为每个PDF创建文件夹
          const folder = zip.folder(pdfFile.name);
          if (!folder) throw new Error('无法创建文件夹');
          
          // 处理每一页
          for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const scale = 2; // 提高分辨率
            const viewport = page.getViewport({ scale });
            
            // 创建 canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) throw new Error('无法创建 canvas context');
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // 渲染页面
            await page.render({
              canvasContext: context,
              viewport: viewport,
              canvas: canvas
            } as any).promise;
            
            // 去水印处理
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const width = canvas.width;
            const height = canvas.height;
            
            // 多种水印检测策略
            for (let j = 0; j < data.length; j += 4) {
              const r = data[j];
              const g = data[j + 1];
              const b = data[j + 2];
              const a = data[j + 3];
              
              // 策略1: 浅色半透明区域（常见的水印特征）
              const brightness = (r + g + b) / 3;
              const isLightColor = brightness > 200;
              const isLowAlpha = a < 200 && a > 50;
              
              // 策略2: 灰色半透明区域
              const isGray = Math.abs(r - g) < 20 && Math.abs(g - b) < 20;
              const isMediumAlpha = a < 180 && a > 30;
              
              // 策略3: 浅蓝色或浅灰色水印
              const isLightBlueOrGray = brightness > 180 && (b > r + 10 || isGray);
              
              // 策略4: 检测重复性水印（对角线区域）
              const pixelIndex = j / 4;
              const x = pixelIndex % width;
              const y = Math.floor(pixelIndex / width);
              const isInBottomRight = x > width * 0.6 && y > height * 0.6;
              const isInCenter = x > width * 0.3 && x < width * 0.7 && y > height * 0.3 && y < height * 0.7;
              
              // 综合判断
              const shouldRemove = 
                (isLightColor && isLowAlpha) ||
                (isGray && isMediumAlpha && brightness > 150) ||
                (isLightBlueOrGray && isMediumAlpha) ||
                (isLightColor && isMediumAlpha && (isInBottomRight || isInCenter));
              
              if (shouldRemove) {
                // 将水印像素替换为白色
                data[j] = 255;
                data[j + 1] = 255;
                data[j + 2] = 255;
                data[j + 3] = 255;
              }
            }
            
            context.putImageData(imageData, 0, 0);
            
            // 转换为 Blob 并添加到 ZIP
            const blob = await new Promise<Blob>((resolve) => {
              canvas.toBlob((blob) => {
                if (blob) resolve(blob);
              }, 'image/png', 1.0);
            });
            
            const pageNumStr = String(pageNum).padStart(2, '0');
            const fileName = `${pdfFile.name}_${pageNumStr}.png`;
            folder.file(fileName, blob);
            
            // 更新进度
            const progress = Math.round((pageNum / numPages) * 100);
            setPdfFiles(prev => prev.map((f, idx) => 
              idx === i ? { ...f, progress, pageCount: numPages } : f
            ));
          }
          
          setPdfFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'completed', progress: 100 } : f
          ));
          
          completedFiles++;
          setGlobalProgress(Math.round((completedFiles / totalFiles) * 100));
          
        } catch (error) {
          console.error(`处理文件 ${pdfFile.name} 失败:`, error);
          setPdfFiles(prev => prev.map((f, idx) => 
            idx === i ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : '处理失败' 
            } : f
          ));
        }
      }
      
      // 生成并下载 ZIP 文件
      setCurrentTask('正在打包文件...');
      const content = await zip.generateAsync({ type: 'blob' });
      
      // 创建下载链接
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PDF处理结果_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setCurrentTask('处理完成！');
      
    } catch (error) {
      console.error('处理失败:', error);
      setCurrentTask('处理失败');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 标题 */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">PDF 批量处理工具</h1>
          <p className="text-muted-foreground">
            去除水印 · 转换图片 · 批量下载
          </p>
        </div>

        {/* 上传区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5" />
              上传 PDF 文件
            </CardTitle>
            <CardDescription>
              支持批量上传多个 PDF 文件进行处理
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 示例文件 */}
              {showExampleFiles && pdfFiles.length === 0 && (
                <Alert className="bg-muted/50">
                  <FileText className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-sm">
                      点击下方按钮快速加载 3 个示例 PDF 文件进行测试
                    </span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleLoadExample}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      加载示例文件
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex gap-3">
                <label className="flex-1">
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isProcessing}
                  />
                  <Button 
                    asChild 
                    className="w-full cursor-pointer"
                    disabled={isProcessing}
                  >
                    <span className="flex items-center gap-2">
                      <FileUp className="w-4 h-4" />
                      选择 PDF 文件
                    </span>
                  </Button>
                </label>
                
                {pdfFiles.length > 0 && (
                  <Button 
                    variant="outline"
                    onClick={handleClearAll}
                    disabled={isProcessing}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    清空列表
                  </Button>
                )}
              </div>

              {/* 文件列表 */}
              {pdfFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">
                    已选择 {pdfFiles.length} 个文件
                  </div>
                  
                  <div className="space-y-2">
                    {pdfFiles.map((pdfFile, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                      >
                        <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{pdfFile.name}</span>
                            <Badge 
                              variant={
                                pdfFile.status === 'completed' ? 'default' :
                                pdfFile.status === 'error' ? 'destructive' :
                                pdfFile.status === 'processing' ? 'secondary' :
                                'outline'
                              }
                            >
                              {pdfFile.status === 'pending' && '等待处理'}
                              {pdfFile.status === 'processing' && '处理中'}
                              {pdfFile.status === 'completed' && '已完成'}
                              {pdfFile.status === 'error' && '失败'}
                            </Badge>
                          </div>
                          
                          {pdfFile.status === 'processing' && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>页面进度</span>
                                <span>{pdfFile.progress}%</span>
                              </div>
                              <Progress value={pdfFile.progress} className="h-1" />
                            </div>
                          )}
                          
                          {pdfFile.pageCount && pdfFile.status === 'completed' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              共 {pdfFile.pageCount} 页
                            </p>
                          )}
                          
                          {pdfFile.error && (
                            <p className="text-xs text-destructive mt-1">{pdfFile.error}</p>
                          )}
                        </div>
                        
                        {!isProcessing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(index)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 处理控制 */}
        {pdfFiles.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {isProcessing && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{currentTask}</span>
                        <span>{globalProgress}%</span>
                      </div>
                      <Progress value={globalProgress} />
                    </div>
                  </>
                )}
                
                <Button 
                  onClick={processPDFs}
                  disabled={isProcessing || pdfFiles.every(f => f.status === 'completed')}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <FolderOpen className="w-4 h-4 mr-2" />
                      开始处理并下载
                    </>
                  )}
                </Button>
                
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    处理完成后，系统将自动下载一个 ZIP 压缩包。每个 PDF 文件会在压缩包内生成一个独立文件夹，图片命名格式为：PDF文件名_01.png、PDF文件名_02.png 等。
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <span className="font-bold text-foreground">1.</span>
              <span>点击"选择 PDF 文件"按钮，选择一个或多个 PDF 文件</span>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-foreground">2.</span>
              <span>点击"开始处理并下载"按钮，系统将自动处理每个 PDF</span>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-foreground">3.</span>
              <span>处理完成后，系统会自动下载一个 ZIP 压缩包</span>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-foreground">4.</span>
              <span>解压后每个 PDF 对应一个文件夹，图片命名格式：PDF文件名_页码.png</span>
            </div>
            <div className="flex gap-3">
              <span className="font-bold text-foreground">5.</span>
              <span>水印去除算法会自动检测并移除浅色半透明水印</span>
            </div>
          </CardContent>
        </Card>

        {/* 底部信息 */}
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <img 
            src="/logo.png" 
            alt="未末" 
            className="h-8 w-auto"
          />
          <span className="text-sm">未末创建的小工具</span>
        </div>
      </div>
    </div>
  );
}
