import type { Metadata } from "next";
import { Suspense } from "react";
import { Copybook } from "@/components/copybook";

export const metadata: Metadata = {
  title: "Прописи",
  description: "Прописи арабских букв, слогов и слов для печати на A4: линовка, серые образцы для обводки, шрифт Amiri.",
};

export default function CopybookPage() {
  return (
    <Suspense fallback={<div className="h-96" aria-busy="true" />}>
      <Copybook />
    </Suspense>
  );
}
