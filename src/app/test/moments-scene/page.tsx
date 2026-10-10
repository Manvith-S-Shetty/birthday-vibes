import { notFound } from "next/navigation";
import { MomentsTestHarness } from "./MomentsTestHarness";

const IS_VERCEL_PRODUCTION =
  process.env.NODE_ENV === "production" &&
  process.env.VERCEL_ENV !== "preview";

export default function TestMomentsScenePage() {
  if (IS_VERCEL_PRODUCTION) {
    notFound();
  }

  return <MomentsTestHarness />;
}
