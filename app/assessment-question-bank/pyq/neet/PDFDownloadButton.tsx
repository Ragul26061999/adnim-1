"use client";
import { PDFDownloadLink } from "@react-pdf/renderer";
import QuestionPaperPDF from "./QuestionPaperPDF";

export default function PDFDownloadButton({ questions, viewYear }: { questions: any[], viewYear: number }) {
  return (
    <PDFDownloadLink
      document={<QuestionPaperPDF questions={questions} viewYear={viewYear} />}
      fileName={`NEET_PYQ_${viewYear}_Question_Paper.pdf`}
      className="mt-2 px-6 py-2 rounded bg-black text-white font-bold shadow hover:bg-gray-800 transition"
    >
      {({ loading }) => loading ? "Preparing PDF..." : "Download as PDF"}
    </PDFDownloadLink>
  );
} 