import React, { useState } from "react";
import { Upload, ClipboardList, RefreshCw, FileDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function App() {
  const [urls, setUrls] = useState([]);
  const [proxy, setProxy] = useState("https://api.allorigins.win/raw?");

  const handlePaste = () => {
    navigator.clipboard.readText().then((text) => {
      const newUrls = text.split(/\s+/).filter(Boolean);
      setUrls([...urls, ...newUrls.map((url) => ({ url, status: "Pending" }))]);
    });
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const header = json[0];
      const urlCol = header.findIndex((h) => /url|link/i.test(h)) || 0;
      const newUrls = json.slice(1).map((row) => row[urlCol]).filter(Boolean);
      setUrls([...urls, ...newUrls.map((url) => ({ url, status: "Pending" }))]);
    };
    reader.readAsArrayBuffer(file);
  };

  const checkStatuses = async () => {
    const updated = await Promise.all(
      urls.map(async (item) => {
        try {
          const res = await fetch(proxy + item.url, { method: "HEAD" });
          return { ...item, status: res.ok ? "✅ OK" : `❌ ${res.status}` };
        } catch (err) {
          return { ...item, status: "⚠️ Error (CORS/Network)" };
        }
      })
    );
    setUrls(updated);
  };

  const exportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(urls);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "URLs");
    const buf = XLSX.write(wb, { bookType: "csv", type: "array" });
    saveAs(new Blob([buf], { type: "text/csv" }), "url_inventory.csv");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <Card className="w-full max-w-5xl shadow-xl">
        <CardHeader className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">🌐 URL Inventory</h1>
          <p className="text-gray-500">Easily manage, validate and export your list of URLs.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <Textarea
              placeholder="Paste URLs (one per line or space separated)"
              className="h-32"
              onChange={(e) =>
                setUrls(e.target.value.split(/\s+/).filter(Boolean).map((url) => ({ url, status: "Pending" })))
              }
            />
            <div className="flex flex-col gap-4">
              <Button variant="outline" onClick={handlePaste}>
                <ClipboardList className="mr-2 h-4 w-4" /> Paste from Clipboard
              </Button>
              <div>
                <label className="block mb-1 text-sm font-medium">Upload CSV/Excel</label>
                <Input type="file" accept=".csv,.xlsx" onChange={handleFile} />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Optional Proxy URL</label>
                <Input value={proxy} onChange={(e) => setProxy(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={checkStatuses}>
              <RefreshCw className="mr-2 h-4 w-4" /> Check Status
            </Button>
            <Button onClick={exportCSV} variant="secondary">
              <FileDown className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button variant="destructive" onClick={() => setUrls([])}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear
            </Button>
          </div>

          {/* URL Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full border rounded-lg">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">URL</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {urls.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="text-center py-4 text-gray-500">
                      No URLs added yet.
                    </td>
                  </tr>
                ) : (
                  urls.map((item, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 text-blue-600 truncate max-w-xs">{item.url}</td>
                      <td className="px-4 py-2">{item.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
