import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { content, getLesson } from "@/content";
import { LessonPlayer } from "@/components/lesson/lesson-player";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(content.lessons).map((lessonId) => ({ lessonId }));
}

export async function generateMetadata({ params }: PageProps<"/learn/[lessonId]">): Promise<Metadata> {
  const { lessonId } = await params;
  return { title: getLesson(lessonId)?.title ?? "Урок" };
}

export default async function LessonPage({ params }: PageProps<"/learn/[lessonId]">) {
  const { lessonId } = await params;
  const lesson = getLesson(lessonId);
  if (!lesson) notFound();
  return <LessonPlayer lesson={lesson} />;
}
