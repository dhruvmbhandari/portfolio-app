/* 
React Portfolio Assignment
- JavaScript (not TypeScript)
- Libraries: react-router-dom, recharts, xlsx
- Expects Excel file with columns: "Date" and "Nav"
*/

import React, { useState, useMemo } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
} from "react-router-dom";
import * as XLSX from "xlsx";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";

// Mock blog data
const BLOGS = [
  {
    id: 1,
    title: "The Focused Way of Investing: Our Four-Quadrant Strategy",
    date: "2024-04-03",
    excerpt: "FY24 brought us a 42% gain...",
  },
  {
    id: 2,
    title: "CM Fixed Income: Exiting Banking & PSU",
    date: "2024-04-18",
    excerpt:
      "We are increasing the duration of our Fixed Income portfolio...",
  },
  {
    id: 3,
    title: "Craftsman Automation: Poised for Growth",
    date: "2024-04-05",
    excerpt: "Unlock this post by trail...",
  },
];

function Navbar() {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
      <div className="font-bold text-xl">
        Capitalmind <span className="text-green-600">Premium</span>
      </div>
      <div className="flex gap-4">
        <Link
          to="/"
          className="text-sm text-gray-700 hover:text-green-600"
        >
          Home
        </Link>
        <Link
          to="/portfolio"
          className="text-sm text-gray-700 hover:text-green-600"
        >
          Portfolio
        </Link>
      </div>
    </div>
  );
}

function Home() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Home</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {BLOGS.map((b) => (
          <article
            key={b.id}
            className="p-6 bg-white rounded shadow-sm"
          >
            <div className="text-sm text-gray-500">{b.date}</div>
            <h2 className="text-lg font-semibold mt-2">{b.title}</h2>
            <p className="text-gray-600 mt-2">{b.excerpt}</p>
            <button className="mt-4 text-sm text-green-600">
              Read full post
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

// Parse Excel -> rows [{date, nav}]
function parseSheetData(workbook) {
  const firstSheetName = workbook.SheetNames[0];
  const ws = workbook.Sheets[firstSheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: null });
  if (!raw || raw.length === 0) return [];

  const rows = raw
    .map((r) => {
      const date = new Date(r["Date"]);
      const nav = Number(r["Nav"]);
      return { date, nav };
    })
    .filter(
      (r) =>
        r.date instanceof Date &&
        !isNaN(r.date) &&
        typeof r.nav === "number" &&
        !isNaN(r.nav)
    )
    .sort((a, b) => a.date - b.date);

  return rows;
}

// Compute equity, drawdown, and monthly returns
function computeSeries(rows) {
  if (!rows || rows.length === 0)
    return { equity: [], drawdown: [], monthReturnsByYear: {} };

  const equity = [];
  let base = rows[0].nav;
  rows.forEach((r) => {
    const value = (r.nav / base) * 100;
    equity.push({
      date: r.date.toISOString().slice(0, 10),
      value: Number(value.toFixed(2)),
    });
  });

  const drawdown = [];
  let peak = -Infinity;
  equity.forEach((pt) => {
    if (pt.value > peak) peak = pt.value;
    const dd = ((pt.value - peak) / peak) * 100;
    drawdown.push({
      date: pt.date,
      drawdown: Number(dd.toFixed(2)),
    });
  });

  const monthReturnsByYear = {};
  const byMonth = {};
  rows.forEach((r) => {
    const y = r.date.getFullYear();
    const m = r.date.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, "0")}`;
    byMonth[key] = r.nav;
  });

  const keysSorted = Object.keys(byMonth).sort();
  keysSorted.forEach((k) => {
    const [y, mm] = k.split("-");
    const val = byMonth[k];
    const prevKey = (() => {
      const mmNum = Number(mm);
      if (mmNum === 1) return `${Number(y) - 1}-12`;
      return `${y}-${String(mmNum - 1).padStart(2, "0")}`;
    })();
    const prevVal = byMonth[prevKey];
    const ret =
      prevVal && prevVal > 0 ? (val / prevVal - 1) * 100 : null;
    if (!monthReturnsByYear[y]) monthReturnsByYear[y] = [];
    monthReturnsByYear[y].push({
      month: mm,
      ret: ret === null ? null : Number(ret.toFixed(2)),
    });
  });

  return { equity, drawdown, monthReturnsByYear };
}

function Portfolio() {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const parsed = useMemo(() => computeSeries(rows), [rows]);

  const onFile = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFileName(f.name);
    const data = await f.arrayBuffer();
    const workbook = XLSX.read(data);
    const parsedRows = parseSheetData(workbook);
    setRows(parsedRows);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Portfolio</h1>
      <div className="mb-6 p-4 bg-white rounded shadow-sm">
        <input
          onChange={onFile}
          type="file"
          accept=".xlsx,.xls,.csv"
        />
        <div className="text-sm text-gray-600 mt-2">
          {fileName ||
            "No file uploaded — upload the Excel with Date and Nav columns"}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-gray-500">
          Upload the Excel to view charts.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Equity Curve */}
          <div className="p-4 bg-white rounded shadow-sm">
            <h2 className="font-semibold mb-2">Equity Curve</h2>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={parsed.equity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v) => v.slice(0, 7)} />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#2f855a"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Drawdown */}
          <div className="p-4 bg-white rounded shadow-sm">
            <h2 className="font-semibold mb-2">Drawdown</h2>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={parsed.drawdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v) => v.slice(0, 7)} />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="drawdown"
                    fill="#fed7d7"
                    stroke="#f56565"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Returns */}
          <div className="p-4 bg-white rounded shadow-sm lg:col-span-2">
            <h2 className="font-semibold mb-2">
              Monthly Returns by Year
            </h2>
            {Object.keys(parsed.monthReturnsByYear)
              .sort()
              .map((year) => {
                const bars = parsed.monthReturnsByYear[year].map(
                  (m) => ({ name: m.month, ret: m.ret || 0 })
                );
                return (
                  <div key={year} className="mb-6">
                    <div className="text-sm font-medium mb-2">
                      {year}
                    </div>
                    <div style={{ height: 150 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bars}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="ret" fill="#2b6cb0" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/portfolio" element={<Portfolio />} />
        </Routes>
      </div>
    </Router>
  );
}
