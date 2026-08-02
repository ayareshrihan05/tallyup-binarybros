import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  tokenColor,
  type MonthSummary,
} from "@/lib/finance";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
);

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
} as const;

export function CategoryDoughnut({ summary }: { summary: MonthSummary }) {
  const values = CATEGORY_ORDER.map((key) => summary.byCategory[key]);
  const empty = values.every((value) => value === 0);

  return (
    <div className="h-56">
      <Doughnut
        data={{
          labels: CATEGORY_ORDER.map((key) => CATEGORY_META[key].label),
          datasets: [
            {
              data: empty ? [1, 1, 1] : values,
              backgroundColor: CATEGORY_ORDER.map((key) =>
                tokenColor(CATEGORY_META[key].token),
              ),
              borderWidth: 0,
              hoverOffset: 8,
            },
          ],
        }}
        options={{
          ...baseOptions,
          cutout: "62%",
          plugins: {
            legend: { display: true, position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } },
          },
        }}
      />
    </div>
  );
}

export function RatioBars({ summary }: { summary: MonthSummary }) {
  return (
    <div className="h-56">
      <Bar
        data={{
          labels: CATEGORY_ORDER.map((key) => CATEGORY_META[key].label),
          datasets: [
            {
              data: CATEGORY_ORDER.map((key) =>
                Number(summary.ratios[key].toFixed(1)),
              ),
              backgroundColor: CATEGORY_ORDER.map((key) =>
                tokenColor(CATEGORY_META[key].token),
              ),
              borderRadius: 12,
              barThickness: 34,
            },
          ],
        }}
        options={{
          ...baseOptions,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: (value) => `${value}%`, font: { size: 11 } },
              grid: { color: "rgba(0,0,0,0.06)" },
            },
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          },
        }}
      />
    </div>
  );
}

export function TrendLine({
  labels,
  spent,
}: {
  labels: string[];
  spent: number[];
}) {
  return (
    <div className="h-56">
      <Line
        data={{
          labels,
          datasets: [
            {
              data: spent,
              borderColor: tokenColor("primary"),
              backgroundColor: "rgba(34,197,94,0.15)",
              tension: 0.35,
              fill: true,
              pointRadius: 4,
              pointBackgroundColor: tokenColor("primary"),
            },
          ],
        }}
        options={{
          ...baseOptions,
          scales: {
            y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.06)" }, ticks: { font: { size: 11 } } },
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          },
        }}
      />
    </div>
  );
}