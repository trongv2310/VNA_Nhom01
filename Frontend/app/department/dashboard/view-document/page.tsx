"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DocumentViewer } from "@/libs/tts/components";
import { Loader2 } from "lucide-react";

function ViewDocumentContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") || "";
  const name = searchParams.get("name") || "Tài liệu";

  if (!url) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-semibold select-none">
        Không tìm thấy đường dẫn tài liệu. Vui lòng kiểm tra lại.
      </div>
    );
  }

  return <DocumentViewer url={url} name={name} />;
}

export default function ViewDocumentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-500 font-semibold select-none gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span>Đang tải tài liệu...</span>
        </div>
      }
    >
      <ViewDocumentContent />
    </Suspense>
  );
}
