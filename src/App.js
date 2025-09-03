import React, { useState } from "react";
import { saveAs } from "file-saver";

function App() {
  const [mode, setMode] = useState("manual"); // "manual" or "crawl"
  const [urls, setUrls] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Handle manual paste
  const handleManualInput = (e) => {
    const lines = e.target.value.split("\n").map((line) => line.trim()).filter(Boolean);
    setUrls(lines);
  };

  // Handle CSV upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    setUrls(lines);
  };

  // Crawl domain using backend
  const handleCrawlDomain = async () => {
    if (urls.length === 0) return alert("Please enter a domain URL first.");
    setLoading(true);

    try {
      const res = await fetch(`/api/crawl?url=${encodeURIComponent(urls[0])}`);
      const data = await res.json();
      if (data.urls) {
        setUrls(data.urls);
      }
    } catch (err) {
      console.error("Crawl error:", err);
    }
    setLoading(false);
  };

  // Check status of all URLs
  const checkUrls = async () => {
    setLoading(true);
    const newResults = [];

    for (let url of urls) {
      try {
        const res = await fetch(url, { method: "HEAD" });
        newResults.push({
          url,
          status: res.status,
          statusText: res.ok ? "✅ OK" : `❌ ${res.status}`,
        });
      } catch (err) {
        newResults.push({ url, status: "Error", statusText: "❌ Failed" });
      }
    }

    setResults(newResults);
    setLoading(false);
  };

  // Export table to CSV
  const exportCSV = () => {
    const header = "URL,Status,Notes\n";
    const rows = results.map((r) => `${r.url},${r.status},"${r.statusText}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    saveAs(blob, "url_inventory.csv");
  };

  // Clear table
  const clearAll = () => {
    setUrls([]);
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6 text-blue-700">
          🌐 URL Inventory Tool
        </h1>

        {/* Mode Toggle */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setMode("manual")}
            className={`px-4 py-2 rounded-lg shadow ${mode === "manual" ? "bg-blue-600 text-white" : "bg-white border"}`}
          >
            Manual URLs / CSV
          </button>
          <button
            onClick={() => setMode("crawl")}
            className={`px-4 py-2 rounded-lg shadow ${mode === "crawl" ? "bg-blue-600 text-white" : "bg-white border"}`}
          >
            Crawl Domain
          </button>
        </div>

        {/* Input Section */}
        {mode === "manual" && (
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <textarea
              placeholder="Paste URLs here, one per line..."
              className="w-full border rounded-lg p-2 mb-3"
              rows={5}
              onChange={handleManualInput}
            />
            <input type="file" accept=".csv,.txt" onChange={handleFileUpload} />
          </div>
        )}

        {mode === "crawl" && (
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <input
              type="text"
              placeholder="Enter domain (e.g., https://example.com)"
              className="w-full border rounded-lg p-2 mb-3"
              onChange={(e) => setUrls([e.target.value])}
            />
            <button
              onClick={handleCrawlDomain}
              className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700"
            >
              {loading ? "Crawling..." : "Crawl Domain"}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={checkUrls}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
          >
            {loading ? "Checking..." : "Check Status"}
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg shadow hover:bg-yellow-600"
            disabled={results.length === 0}
          >
            Export CSV
          </button>
          <button
            onClick={clearAll}
            className="px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700"
          >
            Clear
          </button>
        </div>

        {/* Results Table */}
        {results.length > 0 && (
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border">URL</th>
                  <th className="px-4 py-2 border">Status</th>
                  <th className="px-4 py-2 border">Notes</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border text-blue-600 break-all">{r.url}</td>
                    <td className="px-4 py-2 border text-center">
                      {r.status === 200 ? (
                        <span className="text-green-600 font-semibold">✅ 200</span>
                      ) : (
                        <span className="text-red-600 font-semibold">{r.statusText}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 border">{r.statusText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
