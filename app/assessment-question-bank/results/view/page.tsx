import * as React from "react";
import Sidebar from "@/app/assessment-question-bank/components/Sidebar";
import Link from "next/link";

export default function ResultsViewPage() {
  const reportCards = [
    {
      title: "Overall School Performance",
      description: "Comprehensive overview of school-wide assessment results",
      icon: "🏫",
      color: "bg-blue-50 border-blue-200 text-blue-700",
      href: "/assessment-question-bank/results/view/overall-school"
    },
    {
      title: "Student Consolidated",
      description: "Individual student performance across all assessments",
      icon: "👨‍🎓",
      color: "bg-green-50 border-green-200 text-green-700",
      href: "/assessment-question-bank/results/view/student-consolidated"
    },
    {
      title: "Classwise Report",
      description: "Performance analysis by class and grade level",
      icon: "📚",
      color: "bg-purple-50 border-purple-200 text-purple-700",
      href: "/assessment-question-bank/results/view/classwisekiro"
    },
    {
      title: "Subjectwise Report",
      description: "Subject-specific performance and trends",
      icon: "📊",
      color: "bg-orange-50 border-orange-200 text-orange-700",
      href: "/assessment-question-bank/results/view/subjectwise"
    },
    // {
    //   title: "Concept Mastery Report",
    //   description: "Understanding of key concepts and learning objectives",
    //   icon: "🧠",
    //   color: "bg-indigo-50 border-indigo-200 text-indigo-700",
    //   href: "/assessment-question-bank/reports/concept-mastery"
    // },
    {
      title: "Difficulty Report",
      description: "Question difficulty analysis and student performance",
      icon: "⚡",
      color: "bg-red-50 border-red-200 text-red-700",
      href: "/assessment-question-bank/results/view/difficulty"
    },
    {
      title: "Bloom's Taxonomy Performance",
      description: "Cognitive skill level assessment and analysis",
      icon: "🌸",
      color: "bg-pink-50 border-pink-200 text-pink-700",
      href: "/assessment-question-bank/results/view/blooms-taxonomy"
    },
    {
      title: "Question Effectiveness Report",
      description: "Analysis of question quality and discrimination",
      icon: "❓",
      color: "bg-teal-50 border-teal-200 text-teal-700",
      href: "/assessment-question-bank/results/view/question-effectiveness"
    },
    {
      title: "Top Performers & At-Risk Students",
      description: "Identification of high achievers and students needing support",
      icon: "🎯",
      color: "bg-yellow-50 border-yellow-200 text-yellow-700",
      href: "/assessment-question-bank/results/view/performers"
    },
    {
      title: "Time Efficiency Reports",
      description: "Analysis of time management and completion patterns",
      icon: "⏱️",
      color: "bg-cyan-50 border-cyan-200 text-cyan-700",
      href: "/assessment-question-bank/results/view/time-efficiency"
    },
    {
      title: "Participation Report",
      description: "Student engagement and participation metrics",
      icon: "📈",
      color: "bg-emerald-50 border-emerald-200 text-emerald-700",
      href: "/assessment-question-bank/results/view/participation"
    },
    {
      title: "Chapterwise Report",
      description: "Performance analysis by textbook chapters and units",
      icon: "📖",
      color: "bg-violet-50 border-violet-200 text-violet-700",
      href: "/assessment-question-bank/results/view/chapterwise"
    },
    {
      title: "Lessonwise Report",
      description: "Detailed analysis of individual lesson performance",
      icon: "📝",
      color: "bg-slate-50 border-slate-200 text-slate-700",
      href: "/assessment-question-bank/results/view/lessonwise"
    }
  ];

  return (
    <div className="min-h-screen flex font-sans bg-[#F8F9FB]">
      <Sidebar />
      <main className="flex-1 bg-[#F8F9FB] p-8 md:p-12 xl:p-16">
        <h1 className="text-3xl font-bold mb-8 text-center" style={{ color: '#2563eb' }}>
          Assessment Reports Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {reportCards.map((card, index) => (
            <Link key={index} href={card.href}>
              <div className={`bg-white rounded-2xl shadow-lg border-2 ${card.color} p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer h-full`}>
                <div className="flex items-center mb-4">
                  <span className="text-3xl mr-3">{card.icon}</span>
                  <h2 className="text-xl font-bold">{card.title}</h2>
                </div>
                <p className="text-sm opacity-80 leading-relaxed">
                  {card.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
