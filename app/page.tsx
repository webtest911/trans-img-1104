"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileImage, X, Download, Loader2 } from "lucide-react";

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일 선택 핸들러
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...imageFiles]);
    }
  }, []);

  // 드래그 앤 드롭 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  // 파일 삭제 핸들러
  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 이미지 형식 감지 함수
  const getImageFormat = (fileType: string): string => {
    if (fileType === "image/png") return "PNG";
    if (fileType === "image/jpeg" || fileType === "image/jpg") return "JPEG";
    if (fileType === "image/gif") return "GIF";
    if (fileType === "image/bmp") return "BMP";
    if (fileType === "image/webp") return "WEBP";
    // 기본값으로 JPEG 반환
    return "JPEG";
  };

  // PDF 변환 핸들러 (클라이언트 사이드 변환)
  const handleConvertToPdf = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);

    try {
      // 동적으로 jsPDF 라이브러리 로드
      const jsPDFModule = await import("jspdf");
      
      // jsPDF v3.x에서는 { jsPDF } 형태로 named export 사용
      let jsPDF: any;
      if (jsPDFModule.jsPDF) {
        // named export 사용
        jsPDF = jsPDFModule.jsPDF;
      } else if (jsPDFModule.default) {
        // default export 사용
        jsPDF = jsPDFModule.default;
      } else {
        // 모듈 자체가 클래스인 경우
        jsPDF = jsPDFModule;
      }

      // 모든 이미지를 하나의 PDF로 합치기
      const pdf = new jsPDF();
      let isFirstPage = true;

      for (const file of selectedFiles) {
        // 이미지 로드
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (err) => {
              console.error("이미지 로드 실패:", err);
              reject(new Error(`이미지 로드 실패: ${file.name}`));
            };
            img.src = e.target?.result as string;
          };
          reader.onerror = (err) => {
            console.error("파일 읽기 실패:", err);
            reject(new Error(`파일 읽기 실패: ${file.name}`));
          };
          reader.readAsDataURL(file);
        });

        // 이미지 형식 감지
        const imageFormat = getImageFormat(file.type);

        // 첫 페이지가 아니면 새 페이지 추가
        if (!isFirstPage) {
          pdf.addPage();
        }

        // PDF 페이지 크기 계산
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgAspectRatio = img.width / img.height;
        const pdfAspectRatio = pdfWidth / pdfHeight;

        let imgWidth = pdfWidth;
        let imgHeight = pdfHeight;
        let x = 0;
        let y = 0;

        // 이미지 비율에 맞춰 크기 조정
        if (imgAspectRatio > pdfAspectRatio) {
          // 이미지가 더 넓은 경우
          imgHeight = pdfWidth / imgAspectRatio;
          y = (pdfHeight - imgHeight) / 2;
        } else {
          // 이미지가 더 높은 경우
          imgWidth = pdfHeight * imgAspectRatio;
          x = (pdfWidth - imgWidth) / 2;
        }

        // 이미지를 PDF에 추가 (형식 자동 감지)
        try {
          pdf.addImage(img.src, imageFormat, x, y, imgWidth, imgHeight);
        } catch (addImageError) {
          // 형식이 지원되지 않는 경우 JPEG로 재시도
          console.warn(
            `${imageFormat} 형식 지원 실패, JPEG로 재시도:`,
            addImageError
          );
          pdf.addImage(img.src, "JPEG", x, y, imgWidth, imgHeight);
        }

        isFirstPage = false;
      }

      // PDF 다운로드
      const fileName =
        selectedFiles.length === 1
          ? `${selectedFiles[0].name.replace(/\.[^/.]+$/, "")}.pdf`
          : "converted-images.pdf";
      pdf.save(fileName);

      alert("PDF 변환이 완료되었습니다!");
      setSelectedFiles([]);
    } catch (error) {
      console.error("PDF 변환 중 오류 발생:", error);
      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류";
      alert(
        `PDF 변환 중 오류가 발생했습니다: ${errorMessage}\n\n다시 시도해주세요.`
      );
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFiles]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-blue-600"></div>
              <span className="text-xl font-bold text-gray-900">
                ImageConverter
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a
                href="#"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                도구
              </a>
              <a
                href="#"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                이용 요금
              </a>
              <button className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                무료 체험
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* 제목 섹션 */}
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            JPG PDF 변환
          </h1>
          <p className="text-lg text-gray-600">
            이미지 파일을 고품질 PDF로 변환하세요
          </p>
        </div>

        {/* 파일 업로드 영역 */}
        <div
          className={`mb-8 rounded-2xl border-2 border-dashed transition-all ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 bg-white hover:border-gray-400"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FileImage className="mb-4 h-16 w-16 text-gray-400" />
            <h3 className="mb-2 text-xl font-semibold text-gray-900">
              파일 선택
            </h3>
            <p className="mb-6 text-gray-600">
              또는 파일을 여기로 끌어 놓으세요
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-blue-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700"
            >
              파일 선택
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            <p className="mt-4 text-sm text-gray-500">
              지원하는 형식: JPG, PNG, BMP, GIF, TIFF
            </p>
          </div>
        </div>

        {/* 선택된 파일 목록 */}
        {selectedFiles.length > 0 && (
          <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              선택된 파일 ({selectedFiles.length}개)
            </h2>
            <div className="space-y-3">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <FileImage className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="rounded-full p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                    aria-label="파일 삭제"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={handleConvertToPdf}
              disabled={isProcessing}
              className="mt-6 w-full rounded-full bg-blue-600 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  변환 중...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  지금 PDF 만들기
                </>
              )}
            </button>
          </div>
        )}

        {/* 정보 섹션 */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-2 font-semibold text-gray-900">안전한 처리</h3>
            <p className="text-sm text-gray-600">
              모든 파일은 안전하게 처리되며, 1시간 후 자동 삭제됩니다.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-2 font-semibold text-gray-900">
              모든 플랫폼 지원
            </h3>
            <p className="text-sm text-gray-600">
              브라우저에서 작동하므로 어떤 운영체제에서도 사용 가능합니다.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-2 font-semibold text-gray-900">고품질 유지</h3>
            <p className="text-sm text-gray-600">
              변환 과정에서 이미지 품질이 손상되지 않습니다.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
