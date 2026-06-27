"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCw,
  FileText,
  File,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ArrowLeftRight,
} from "lucide-react";

interface DocumentViewerProps {
  url: string;
  name: string;
}

const PAGE_COUNT_CACHE_KEY = "vna_pdf_page_counts";

const getCachedPageCount = (url: string): number | null => {
  try {
    const cacheStr = sessionStorage.getItem(PAGE_COUNT_CACHE_KEY);
    if (cacheStr) {
      const cache = JSON.parse(cacheStr);
      return cache[url] || null;
    }
  } catch (e) {
    console.error("Cache read error:", e);
  }
  return null;
};

const setCachedPageCount = (url: string, count: number) => {
  try {
    const cacheStr = sessionStorage.getItem(PAGE_COUNT_CACHE_KEY) || "{}";
    const cache = JSON.parse(cacheStr);
    cache[url] = count;
    sessionStorage.setItem(PAGE_COUNT_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error("Cache write error:", e);
  }
};

const PageSkeleton = ({ zoomMode, scale }: { zoomMode: string; scale: number }) => {
  return (
    <div
      className="bg-zinc-200/60 dark:bg-zinc-800/40 animate-pulse rounded-lg flex items-center justify-center relative flex-shrink-0 border border-zinc-200 dark:border-zinc-850"
      style={{
        width: zoomMode === "fit-width" ? "100%" : zoomMode === "fit-page" ? "auto" : `${scale * 820}px`,
        height: zoomMode === "fit-page" ? "calc(100vh - 96px)" : "auto",
        maxWidth: zoomMode === "fit-width" ? "920px" : "none",
        aspectRatio: "612 / 792",
      }}
    >
      <Loader2 className="w-6 h-6 animate-spin text-zinc-400 dark:text-zinc-650" />
    </div>
  );
};

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ url, name }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [zoomMode, setZoomMode] = useState<"custom" | "fit-width" | "fit-page">("fit-width");

  // Pagination and loading states for Cloudinary PDF fallback
  const [currentPage, setCurrentPage] = useState(1);
  const [pages, setPages] = useState<number[]>([1]);
  const [maxPage, setMaxPage] = useState<number | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [pageLoadingStates, setPageLoadingStates] = useState<Record<number, boolean>>({ 1: true });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Performance-oriented states
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Helper to determine file type based on extension
  const getFileType = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (!ext) return "unknown";
    if (["pdf"].includes(ext)) return "pdf";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
    if (["doc", "docx"].includes(ext)) return "word";
    if (["xls", "xlsx"].includes(ext)) return "excel";
    return "unknown";
  };

  const fileType = getFileType(name);

  // Cloudinary PDF check
  const isCloudinaryPdf =
    url.includes("res.cloudinary.com") &&
    (url.toLowerCase().includes(".pdf") || name.toLowerCase().endsWith(".pdf"));

  // Helper to construct Cloudinary PDF page to PNG URL
  const getCloudinaryPageUrl = (pdfUrl: string, pageNum: number) => {
    let transformedUrl = pdfUrl.replace(/\.pdf$/i, ".png");
    transformedUrl = transformedUrl.replace("/image/upload/", `/image/upload/pg_${pageNum}/`);
    return transformedUrl;
  };

  // Prefetch total page count from Cloudinary custom error headers
  useEffect(() => {
    if (!isCloudinaryPdf) return;

    // Check cache first
    const cachedCount = getCachedPageCount(url);
    if (cachedCount) {
      setMaxPage(cachedCount);
      const initialPages = Array.from({ length: cachedCount }, (_, i) => i + 1);
      setPages(initialPages);
      const initialStates: Record<number, boolean> = {};
      initialPages.forEach((p) => {
        initialStates[p] = true;
      });
      setPageLoadingStates(initialStates);
      return;
    }

    const abortController = new AbortController();
    setMetadataLoading(true);

    const fetchPageCount = async () => {
      try {
        const testUrl = getCloudinaryPageUrl(url, 1000);
        const res = await fetch(testUrl, {
          method: "GET",
          signal: abortController.signal,
        });

        const xCldError = res.headers.get("x-cld-error");
        if (xCldError) {
          const match = xCldError.match(/only has (\d+) pages/i) || xCldError.match(/Image only has (\d+) pages/i);
          if (match) {
            const total = parseInt(match[1], 10);
            setMaxPage(total);
            setCachedPageCount(url, total);
            const newPages = Array.from({ length: total }, (_, i) => i + 1);
            setPages(newPages);
            const initialStates: Record<number, boolean> = {};
            newPages.forEach((p) => {
              initialStates[p] = true;
            });
            setPageLoadingStates(initialStates);
            setMetadataLoading(false);
            return;
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("Error pre-fetching page count:", err);
      }

      // Fallback: load incrementally if prefetch fail
      setMetadataLoading(false);
      setPages([1]);
      setPageLoadingStates({ 1: true });
    };

    fetchPageCount();

    return () => {
      abortController.abort();
    };
  }, [url, isCloudinaryPdf]);

  // Delay skeleton loading display for 300ms to prevent flickering on fast cache hits
  useEffect(() => {
    if (metadataLoading) {
      const timer = setTimeout(() => setShowSkeleton(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowSkeleton(false);
    }
  }, [metadataLoading]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Event listeners for Ctrl+Wheel Zoom and Touch Pinch Zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 0.1 : -0.1;
        setZoomMode("custom");
        setScale((prev) => Math.max(0.5, Math.min(3, prev + factor)));
      }
    };

    let touchStartDist: number | null = null;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        touchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStartDist !== null) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / touchStartDist;
        setZoomMode("custom");
        setScale((prev) => {
          touchStartDist = dist;
          return Math.max(0.5, Math.min(3, prev * factor));
        });
      }
    };

    const handleTouchEnd = () => {
      touchStartDist = null;
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  const handleBack = () => {
    if (typeof window !== "undefined") {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
        setTimeout(() => {
          window.location.href = "/department/dashboard";
        }, 100);
      }
    }
  };

  const handleZoomIn = () => {
    setZoomMode("custom");
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomMode("custom");
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoomMode("custom");
    setScale(1);
    setRotation(0);
  };

  const handleFitWidth = () => {
    setZoomMode("fit-width");
    setScale(1);
  };

  const handleFitPage = () => {
    setZoomMode("fit-page");
    setScale(1);
  };

  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const toggleFullscreen = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (!document.fullscreenElement) {
      viewer.requestFullscreen().catch((err) => {
        console.error("Fullscreen error:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Cloudinary PDF rendering page load triggers
  const handlePageLoad = (pageNum: number) => {
    setPageLoadingStates((prev) => ({ ...prev, [pageNum]: false }));

    // Fallback mode: Preload next page sequentially only if maxPage is not pre-fetched
    if (maxPage === undefined && pageNum === pages[pages.length - 1]) {
      const nextPage = pageNum + 1;
      setPages((prev) => [...prev, nextPage]);
      setPageLoadingStates((prev) => ({ ...prev, [nextPage]: true }));
    }
  };

  const handlePageError = (pageNum: number) => {
    if (maxPage === undefined) {
      const lastValidPage = pageNum - 1;
      setMaxPage(lastValidPage);
      setPages((prev) => prev.filter((p) => p <= lastValidPage));
    }
    setPageLoadingStates((prev) => ({ ...prev, [pageNum]: false }));
  };

  // Scroll position updates currentPage indicator in Header
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const pageElements = container.querySelectorAll("[data-page]");
    let closestPage = 1;
    let minDistance = Infinity;
    const containerCenter = container.getBoundingClientRect().top + container.clientHeight / 2;

    pageElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const elCenter = rect.top + rect.height / 2;
      const distance = Math.abs(elCenter - containerCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestPage = parseInt(el.getAttribute("data-page") || "1", 10);
      }
    });

    if (closestPage !== currentPage) {
      setCurrentPage(closestPage);
    }
  };

  const scrollToPage = (pageNum: number) => {
    const container = containerRef.current;
    if (!container) return;

    const pageElement = container.querySelector(`[data-page="${pageNum}"]`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleNextPageBtn = () => {
    if (maxPage !== undefined && currentPage >= maxPage) return;
    const nextPage = currentPage + 1;
    if (!pages.includes(nextPage)) {
      setPages((prev) => [...prev, nextPage]);
      setPageLoadingStates((prev) => ({ ...prev, [nextPage]: true }));
    }
    setTimeout(() => scrollToPage(nextPage), 50);
  };

  const handlePrevPageBtn = () => {
    if (currentPage <= 1) return;
    scrollToPage(currentPage - 1);
  };

  // Immediate loading view using debounced skeleton loading
  if (isCloudinaryPdf && metadataLoading && showSkeleton) {
    return (
      <div className="flex flex-col h-screen w-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 overflow-hidden font-sans">
        <header className="h-16 min-h-16 w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between shadow-sm z-30 select-none">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-500">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-4 w-36 bg-zinc-200 dark:bg-zinc-850 rounded animate-pulse" />
          </div>
        </header>
        <main className="flex-1 w-full h-[calc(100vh-64px)] overflow-hidden bg-zinc-100 dark:bg-zinc-900/40 p-4 md:p-6 flex flex-col items-center gap-6">
          <PageSkeleton zoomMode={zoomMode} scale={scale} />
          <PageSkeleton zoomMode={zoomMode} scale={scale} />
          <PageSkeleton zoomMode={zoomMode} scale={scale} />
        </main>
      </div>
    );
  }

  return (
    <div
      ref={viewerRef}
      className="flex flex-col h-screen w-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 overflow-hidden font-sans"
    >
      {/* Fixed Header */}
      <header className="h-16 min-h-16 w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 md:px-6 flex items-center justify-between shadow-sm z-30 select-none">
        <div className="flex items-center gap-3 md:gap-4 overflow-hidden max-w-[30%] md:max-w-[45%]">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors flex-shrink-0 cursor-pointer"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col overflow-hidden">
            <h1 className="text-sm md:text-base font-bold truncate pr-2" title={name}>
              {name}
            </h1>
            <span className="text-[10px] md:text-xs text-zinc-400 font-medium uppercase tracking-wider">
              {isCloudinaryPdf
                ? "Tài liệu PDF (Cloud)"
                : fileType === "pdf"
                ? "Tài liệu PDF"
                : fileType === "image"
                ? "Hình ảnh"
                : fileType === "word"
                ? "Tài liệu Word"
                : "Tệp tin"}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Pagination Controls for Cloudinary PDF */}
          {isCloudinaryPdf && !loadError && (
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 gap-1">
              <button
                onClick={handlePrevPageBtn}
                disabled={currentPage <= 1}
                className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer disabled:cursor-not-allowed"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4 md:w-4.5 md:h-4.5" />
              </button>
              <span className="text-[11px] md:text-xs font-semibold px-1 md:px-2 min-w-[70px] md:min-w-[85px] text-center font-mono select-none">
                Trang {currentPage} / {maxPage || "..."}
              </span>
              <button
                onClick={handleNextPageBtn}
                disabled={maxPage !== undefined && currentPage >= maxPage}
                className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer disabled:cursor-not-allowed"
                title="Trang tiếp"
              >
                <ChevronRight className="w-4 h-4 md:w-4.5 md:h-4.5" />
              </button>
            </div>
          )}

          {/* Zoom and View Controls */}
          {(fileType === "image" || (isCloudinaryPdf && !loadError)) && (
            <div className="hidden lg:flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 gap-1">
              <button
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-4.5 h-4.5" />
              </button>
              <span className="text-xs font-semibold px-2 min-w-[55px] text-center font-mono select-none">
                {zoomMode === "fit-width" ? "Fit W" : zoomMode === "fit-page" ? "Fit P" : `${Math.round(scale * 100)}%`}
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="w-4.5 h-4.5" />
              </button>

              <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-650 mx-1" />

              <button
                onClick={handleFitWidth}
                className={`p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer ${
                  zoomMode === "fit-width" ? "bg-white dark:bg-zinc-700 shadow-xs" : "hover:bg-white dark:hover:bg-zinc-700"
                }`}
                title="Tự động vừa khít chiều ngang"
              >
                <ArrowLeftRight className="w-4.5 h-4.5" />
              </button>

              <button
                onClick={handleFitPage}
                className={`p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer ${
                  zoomMode === "fit-page" ? "bg-white dark:bg-zinc-700 shadow-xs" : "hover:bg-white dark:hover:bg-zinc-700"
                }`}
                title="Tự động vừa khít chiều cao trang"
              >
                <Maximize className="w-4.5 h-4.5" />
              </button>

              <button
                onClick={handleResetZoom}
                className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer"
                title="Reset Zoom & Xoay"
              >
                <RotateCw className="w-4.5 h-4.5" />
              </button>
            </div>
          )}

          {/* Fullscreen & Download Controls */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-zinc-150 dark:hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer"
              title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            >
              {isFullscreen ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5" />}
            </button>

            <a
              href={url}
              download={name}
              className="flex items-center gap-1.5 md:gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs md:text-sm rounded-xl shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-98 transition-all cursor-pointer select-none"
              title="Tải xuống tệp tin"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Tải xuống</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full h-[calc(100vh-64px)] relative overflow-hidden bg-zinc-100 dark:bg-zinc-900/40">
        {isCloudinaryPdf ? (
          loadError ? (
            <div className="w-full h-full flex items-center justify-center p-6 bg-zinc-100 dark:bg-zinc-900/40">
              <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl max-w-md w-full animate-in zoom-in-95 duration-200 select-none">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                  <FileText className="w-8 h-8" />
                </div>
                <h2 className="font-bold text-base md:text-lg text-zinc-800 dark:text-zinc-200 mb-2 truncate w-full px-4">
                  {name}
                </h2>
                <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
                  Không thể hiển thị tệp PDF này trực tuyến do thiết lập quyền bảo mật của Cloudinary. Bạn vui lòng tải xuống máy tính để xem trực tiếp.
                </p>
                <a
                  href={url}
                  download={name}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Tải xuống tài liệu PDF
                </a>
              </div>
            </div>
          ) : (
            <div
              ref={containerRef}
              onScroll={handleScroll}
              className="w-full h-full overflow-auto flex flex-col items-center gap-6 p-4 md:p-6 select-none scroll-smooth"
            >
              {pages.map((pageNum) => (
                <div
                  key={pageNum}
                  data-page={pageNum}
                  className="bg-white dark:bg-zinc-950 shadow-md border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden flex items-center justify-center relative flex-shrink-0 transition-all duration-200"
                  style={{
                    width: zoomMode === "fit-width" ? "100%" : zoomMode === "fit-page" ? "auto" : `${scale * 820}px`,
                    height: zoomMode === "fit-page" ? "calc(100vh - 96px)" : "auto",
                    maxWidth: zoomMode === "fit-width" ? "920px" : "none",
                    aspectRatio: "612 / 792", // Preserves PDF container proportions before image loads
                  }}
                >
                  {pageLoadingStates[pageNum] && (
                    <div className="absolute inset-0 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xs flex items-center justify-center z-10">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  )}
                  <img
                    src={getCloudinaryPageUrl(url, pageNum)}
                    alt={`${name} - Trang ${pageNum}`}
                    onLoad={() => handlePageLoad(pageNum)}
                    onError={() => handlePageError(pageNum)}
                    loading={maxPage !== undefined ? "lazy" : "eager"}
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transition: "transform 0.2s ease-out",
                    }}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                </div>
              ))}
            </div>
          )
        ) : fileType === "pdf" ? (
          <div className="w-full h-full relative">
            <iframe
              src={`${url}#toolbar=1`}
              title={name}
              className="w-full h-full border-0 absolute inset-0 bg-zinc-100 dark:bg-zinc-900"
            />
          </div>
        ) : fileType === "image" ? (
          <div
            ref={containerRef}
            className="w-full h-full overflow-auto flex items-center justify-center p-4"
          >
            <div className="relative max-w-full max-h-full transition-transform duration-200 ease-out flex items-center justify-center">
              <img
                src={url}
                alt={name}
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease-out",
                }}
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-850"
              />
            </div>
          </div>
        ) : fileType === "word" ? (
          <div className="w-full h-full flex items-center justify-center p-6">
            <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl max-w-md w-full animate-in zoom-in-95 duration-200 select-none">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                <FileText className="w-8 h-8" />
              </div>
              <h2 className="font-bold text-base md:text-lg text-zinc-800 dark:text-zinc-200 mb-2 truncate w-full px-4">
                {name}
              </h2>
              <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
                Tài liệu định dạng Word không hỗ trợ xem trước trực tiếp trên trình duyệt. Vui lòng tải xuống để đọc và chỉnh sửa.
              </p>
              <a
                href={url}
                download={name}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Tải xuống tài liệu
              </a>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-6">
            <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl max-w-md w-full animate-in zoom-in-95 duration-200 select-none">
              <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 rounded-2xl flex items-center justify-center mb-6">
                <File className="w-8 h-8" />
              </div>
              <h2 className="font-bold text-base md:text-lg text-zinc-800 dark:text-zinc-200 mb-2 truncate w-full px-4">
                {name}
              </h2>
              <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
                Tệp tin này không hỗ trợ xem trước trực tiếp. Bạn vui lòng tải xuống tệp tin này để kiểm tra nội dung.
              </p>
              <a
                href={url}
                download={name}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Tải xuống tệp tin
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
