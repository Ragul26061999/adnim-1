"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AssessmentRootRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/assessment-question-bank/dashboard");
  }, [router]);
  return null;
} 