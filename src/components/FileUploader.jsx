import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DocumentPageViewer from '@/components/DocumentPageViewer';
import {
  extractBoundingPages,
  generateMarkdown,
  getImageSourceFromStatus,
} from '@/lib/resultParsing';

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const getStatusBadge = (status) => {
  switch (status?.status) {
    case 'loading':
      return (
        <Badge variant="outline" className="bg-blue-50">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />Analyzing
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />Completed
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />Error
        </Badge>
      );
    default:
      return <Badge variant="secondary">Ready</Badge>;
  }
};

const FileUploader = () => {
  const [files, setFiles] = useState([]);
  const [loadingStatuses, setLoadingStatuses] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    
    const newFiles = Array.from(event.dataTransfer.files);
    setFiles((prevFiles) => {
      // add previews for each new file
      newFiles.forEach((f) => {
        const url = URL.createObjectURL(f);
        setLoadingStatuses((prev) => ({ ...prev, [f.name]: { ...(prev[f.name] || {}), preview: url } }));
      });
      return [...prevFiles, ...newFiles];
    });
  };

  const handleFileChange = (event) => {
    const newFiles = Array.from(event.target.files);
    setFiles((prevFiles) => {
      newFiles.forEach((f) => {
        const url = URL.createObjectURL(f);
        setLoadingStatuses((prev) => ({ ...prev, [f.name]: { ...(prev[f.name] || {}), preview: url } }));
      });
      return [...prevFiles, ...newFiles];
    });
  };

  const removeFile = (fileName) => {
    setFiles((prevFiles) => prevFiles.filter(file => file.name !== fileName));
    setLoadingStatuses((prev) => {
      const newStatuses = { ...prev };
      if (newStatuses[fileName]?.preview) {
        try { URL.revokeObjectURL(newStatuses[fileName].preview); } catch (e) {}
      }
      delete newStatuses[fileName];
      return newStatuses;
    });
  };

  const analyzeFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    setLoadingStatuses((prev) => ({
      ...prev,
      [file.name]: { ...(prev[file.name] || {}), status: 'loading', progress: 0 },
    }));

    try {
      const response = await axios.post('http://192.168.2.126:18200/doc_parser', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setLoadingStatuses((prev) => ({
            ...prev,
            [file.name]: { ...prev[file.name], progress },
          }));
        },
      });
      
      setLoadingStatuses((prev) => ({
        ...prev,
        [file.name]: { ...(prev[file.name] || {}), status: 'completed', data: response.data, detailsVisible: false },
      }));
    } catch (error) {
      setLoadingStatuses((prev) => ({
        ...prev,
        [file.name]: { ...(prev[file.name] || {}), status: 'error', error: error.message, detailsVisible: false },
      }));
    }
  };

  const toggleDetails = (fileName) => {
    setLoadingStatuses((prev) => {
      const currently = prev[fileName];
      const newVisible = !currently?.detailsVisible;
      return {
        ...prev,
        [fileName]: {
          ...currently,
          detailsVisible: newVisible,
          activeTab: currently?.activeTab || (currently?.preview ? 'image' : 'json'),
        },
      };
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-6 h-6" />
            Document Analyzer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-lg p-2
              transition-all duration-200 cursor-pointer
              hover:border-primary hover:bg-accent/50
              ${dragActive ? 'border-primary bg-accent' : 'border-muted-foreground/25'}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className={`p-4 rounded-full ${dragActive ? 'bg-primary/10' : 'bg-muted'}`}>
                <Upload className={`w-8 h-8 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-lg font-medium">
                  {dragActive ? 'Drop files here' : 'Drag and drop files here'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse from your computer
                </p>
                <br/>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Uploaded Files ({files.length})
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  // revoke any previews
                  Object.values(loadingStatuses).forEach(s => {
                    if (s?.preview) {
                      try { URL.revokeObjectURL(s.preview); } catch (e) {}
                    }
                  });
                  setFiles([]);
                  setLoadingStatuses({});
                }}
              >
                Clear All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="pr-4">
              <div className="space-y-4">
                {files.map((file) => (
                  <UploadedFileCard
                    key={file.name}
                    file={file}
                    status={loadingStatuses[file.name]}
                    onAnalyze={() => analyzeFile(file)}
                    onToggleDetails={() => toggleDetails(file.name)}
                    onRemove={() => removeFile(file.name)}
                    onTabChange={(tab) => setLoadingStatuses((prev) => ({
                      ...prev,
                      [file.name]: { ...prev[file.name], activeTab: tab },
                    }))}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUploader;

const UploadedFileCard = ({ file, status, onAnalyze, onToggleDetails, onRemove, onTabChange }) => {
  const boundingPages = React.useMemo(() => extractBoundingPages(status?.data), [status?.data]);
  const imageSrc = React.useMemo(() => getImageSourceFromStatus(status), [status]);
  const previewUrl = status?.preview || null;
  const isPdfDocument = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');

  const canAnalyze = !status || (status.status !== 'loading' && status.status !== 'completed');
  const canShowDetails = status && (status.preview || status.status === 'completed' || status.status === 'error');

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 mt-1">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="font-medium truncate text-left">{file.name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                {getStatusBadge(status)}
              </div>

              {status?.status === 'loading' && (
                <div className="space-y-1 mt-2">
                  <Progress value={status.progress || 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {status.progress || 0}% uploaded
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canAnalyze && (
              <Button onClick={onAnalyze} size="sm" disabled={status?.status === 'loading'}>
                {status?.status === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing
                  </>
                ) : (
                  'Analyze'
                )}
              </Button>
            )}

            {canShowDetails && (
              <Button onClick={onToggleDetails} variant="outline" size="sm">
                {status?.detailsVisible ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    Details
                  </>
                )}
              </Button>
            )}

            <Button onClick={onRemove} variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {status?.detailsVisible && (
          <div className="mt-4 pt-4 border-t">
            {status.status === 'error' ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{status.error}</AlertDescription>
              </Alert>
            ) : (
              <Tabs value={status?.activeTab || 'json'} onValueChange={onTabChange}>
                <TabsList>
                  <TabsTrigger value="markdown">Markdown</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                  <TabsTrigger value="image">Original image</TabsTrigger>
                  <TabsTrigger value="overlay">Overlay</TabsTrigger>
                </TabsList>

                <TabsContent value="markdown">
                  <ScrollArea className="h-[420px] w-full rounded-md border">
                    <div className="markdown-content">
                      <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                        {generateMarkdown(status?.data)}
                      </ReactMarkdown>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="json">
                  <ScrollArea className="h-[420px] w-full rounded-md border">
                    <pre className="p-4 text-xs text-left whitespace-pre-wrap break-words overflow-x-auto">
                      {JSON.stringify(status?.data, null, 2)}
                    </pre>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="image">
                  <div className="w-full p-4">
                    <DocumentPageViewer
                      pageInfos={boundingPages}
                      fallbackImage={imageSrc}
                      pdfSource={isPdfDocument ? previewUrl : null}
                      isPdfDocument={isPdfDocument}
                      maxHeight="460px"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="overlay">
                  <div className="w-full p-4">
                    <DocumentPageViewer
                      pageInfos={boundingPages}
                      fallbackImage={imageSrc}
                      pdfSource={isPdfDocument ? previewUrl : null}
                      isPdfDocument={isPdfDocument}
                      showOverlay
                      maxHeight="540px"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};