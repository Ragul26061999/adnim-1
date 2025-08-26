"use client";

import React from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// Minimal chart data shape used across the app
export type ChartData = {
  labels: string[];
  datasets: Array<{
    label?: string;
    data: number[];
    backgroundColor?: string[] | string;
    borderColor?: string[] | string;
  }>;
};

export function PieChart({ data }: { data: ChartData }) {
  return (
    <Pie
      data={data as any}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
      }}
    />
  );
}

export function BarChart({ data }: { data: ChartData }) {
  return (
    <Bar
      data={data as any}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" }, title: { display: false, text: "" } },
        scales: { x: { stacked: false }, y: { beginAtZero: true, max: 100 } },
      }}
    />
  );
}
