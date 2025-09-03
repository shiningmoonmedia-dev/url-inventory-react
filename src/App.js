import React, { useState } from "react";
import axios from "axios";

function App() {
  const [mode, setMode] = useState("manual"); // manual or crawl
  const [inputUrls, setInputUrls] = useState("");
  const [fileUrls, setFileUrls] = useState([]);
  const [domain, setDomain] = useState("");
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(false);

  // Handle CSV Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
      setFileUrls(lines);
    };
    reader.readAsText(file);
  };

  // Check status of URLs
  const handleCheckStatus = async () => {
    setLoading(true);
    let combined = [];

    if (mode === "manual") {
      combined = [
        ...inputUrls.split(/\r?\n/).filter((u) => u.trim() !== ""),
        ...fileUrls,
      ];
    }

    if (mode === "crawl") {
      try {
        const res = await axios.get(`/api/crawl?url=${encodeURIComponent(domain)}`);
        combined = res.data.links || [];
      } catch (err) {
        console.error("Crawl error:", err);
        setLoading(false);
        return;
      }
    }

    // Fetch status codes
    const results = await Promise.all(
      combined.map(async (url) => {
        try {
          const response = await fetch(url, { method: "HEAD" });
          return { url, status: response.status };
        } catch {
          return { url, status: "Error" };
        }
      })
    );

    setUrls(results);
    setLoading(false);
  };

  // Export as CSV
  const handleExportCSV = () => {
    const header = "URL,Status\n";
    const rows = urls.map((u) => `${u.url},${u.status}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = "url-inventory.csv";
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          🌐 URL Inventory Tool --
        </h1>

        {/* Mode Tabs */}
        <div className="flex gap-3 mb-6 justify-center">
          <button
            onClick={() => setMode("manual")}
            className={`px-4 py-2 rounded-lg ${
              mode === "manual"
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Manual URLs / CSV
          </button>
          <button
            onClick={() => setMode("crawl")}
            className={`px-4 py-2 rounded-lg ${
              mode === "crawl"
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Crawl Domain
          </button>
        </div>

        {/* Manual Mode */}
        {mode === "manual" && (
          <div>
            <textarea
              value={inputUrls}
              onChange={(e) => setInputUrls(e.target.value)}
              placeholder="Paste URLs here (one per line)..."
              rows={5}
              className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400"
            />
            <div className="mt-4 flex items-center gap-3">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-700 border rounded-lg cursor-pointer focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Crawl Mode */}
        {mode === "crawl" && (
          <div>
            <input
              type="text"
              placeholder="Enter domain e.g. https://example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={handleCheckStatus}
            className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Processing..." : "Check Status"}
          </button>
          <button
            onClick={handleExportCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
          >
            Export CSV
          </button>
        </div>

        {/* Results Table */}
        {urls.length > 0 && (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2 border">#</th>
                  <th className="p-2 border">URL</th>
                  <th className="p-2 border">Status</th>
                </tr>
              </thead>
              <tbody>
                {urls.map((u, i) => (
                  <tr
                    key={i}
                    className="odd:bg-white even:bg-gray-50 hover:bg-gray-100"
                  >
                    <td className="p-2 border">{i + 1}</td>
                    <td className="p-2 border">{u.url}</td>
                    <td className="p-2 border">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          u.status === 200
                            ? "bg-green-100 text-green-700"
                            : u.status === "Error"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
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
