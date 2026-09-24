import type { Metadata } from "next";
import { CourseMap } from "@/components/course-map";

export const metadata: Metadata = { title: "Карта курса" };

export default function CoursePage() {
  return <CourseMap />;
}
