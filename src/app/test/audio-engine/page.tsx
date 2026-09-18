import { notFound } from "next/navigation";
import { AudioEngineTestHarness } from "./AudioEngineTestHarness";

const IS_VERCEL_PRODUCTION =
  process.env.NODE_ENV === "production" &&
  process.env.VERCEL_ENV !== "preview";

export default function TestAudioEnginePage() {
  if (IS_VERCEL_PRODUCTION) {
    notFound();
  }

  return <AudioEngineTestHarness />;
}
