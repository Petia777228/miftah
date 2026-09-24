import type { Metadata } from "next";
import { Alphabet } from "@/components/alphabet";

export const metadata: Metadata = { title: "Алфавит" };

export default function AlphabetPage() {
  return <Alphabet />;
}
