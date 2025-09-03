import React, { useState, useRef } from 'react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

// Single-file React component: URL Inventory App
// - Tailwind CSS classes used for styling
// - Features: paste/add URLs, upload Excel/CSV, detect duplicates, simple status check (HEAD)
// - Notes: HTTP status checks can fail due to CORS. The app accepts an optional CORS-proxy URL.

export default function UrlInventoryApp() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [proxy, setProxy] = useState('');
  const fileInputRef = useRef(null);
  const urlInputRef = useRef(null);

  function normalizeUrl(u) {
    try {
      const url = new URL(u.trim());
      return url.href;
    } catch (e) {
      // try adding https://
      try {
        const url = new URL('https://' + u.trim());
        return url.href;
      } catch (e) {
        return null;
      }
    }
  }

  function addUrlsFromText(text) {
    const lines = text.split(/\n|,|;|\s+/).map(s => s.trim()).filter(Boolean);
    const newRows = [];
    for (const raw of lines) {
      const u = normalizeUrl(raw);
      if (u) {
        newRows.push({ url: u, title: '', category: '', status: 'Unknown', notes: '' });
      }
    }
    if (newRows.length) {
      setRows(prev => dedupe([...prev, ...newRows]));
    }
  }

  function dedupe(list) {
    const seen = new Set();
    const out = [];
    for (const r of list) {
      const k = r.url.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(r);
      } else {
        // mark duplicate in notes
        out.push(r);
      }
    }
    return out;
  }

  function handleAddUrl() {
    const txt = urlInputRef.current.value;
    if (!txt) return;
    addUrlsFromText(txt);
    urlInputRef.current.value = '';
  }

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      // try to detect a column with URLs
      const header = json[0] || [];
      let urlCol = 0;
      // look for typical header names
      for (let i = 0; i < header.length; i++) {
        const h = (header[i] || '').toString().toLowerCase();
        if (['url', 'link', 'page'].includes(h)) { urlCol = i; break; }
      }
      const newRows = [];
      for (let r = 1; r < json.length; r++) {
        const row = json[r];
        if (!row) continue;
        const raw = row[urlCol] || row[0];
        if (raw) {
          const u = normalizeUrl(raw.toString());
          if (u) newRows.push({ url: u, title: row[1] || '', category: row[2] || '', status: 'Unknown', notes: '' });
        }
      }
      if (newRows.length) setRows(prev => dedupe([...prev, ...newRows]));
    };
    reader.readAsArrayBuffer(f);
  }

  function exportCSV() {
    const header = ['URL','Page Title','Category','Status','Notes'];
    const csv = [header.join(',')];
    for (const r of rows) {
      const line = [r.url, r.title || '', r.category || '', r.status || '', (r.notes || '').replace(/\n/g,' ')]
        .map(v => '"' + (v || '').toString().replace(/"/g,'""') + '"')
        .join(',');
      csv.push(line);
    }
    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'url_inventory.csv');
  }

  async function checkStatus(index) {
    const r = rows[index];
    if (!r) return;
    const target = proxy ? proxy + encodeURIComponent(r.url) : r.url;
    setRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status: 'Checking...' };
      return copy;
    });
    try {
      const res = await fetch(target, { method: 'HEAD', mode: 'cors' });
      setRows(prev => {
        const copy = [...prev];
        copy[index] = { ...copy[index], status: res.status + ' ' + res.statusText };
        return copy;
      });
    } catch (err) {
      setRows(prev => {
        const copy = [...prev];
        copy[index] = { ...copy[index], status: 'Error (CORS or network)' };
        return copy;
      });
    }
  }

  async function checkAllStatuses() {
    for (let i = 0; i < rows.length; i++) {
      // small delay to avoid overwhelming
      // but we won't actually delay here to keep UI responsive
      checkStatus(i);
    }
  }

  function updateCell(i, key, value) {
    setRows(prev => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [key]: value };
      return copy;
    });
  }

  function removeRow(i) {
    setRows(prev => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">URL Inventory — Web App</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Paste URLs (one per line or separated by spaces)</label>
          <textarea ref={urlInputRef} className="w-full p-2 border rounded h-28" placeholder="https://example.com\nhttps://example.com/about"></textarea>
          <div className="flex gap-2">
            <button onClick={handleAddUrl} className="px-3 py-2 bg-blue-600 text-white rounded">Add URLs</button>
            <button onClick={() => addUrlsFromText(navigator.clipboard ? (navigator.clipboard.readText().then(text=>addUrlsFromText(text))).catch(()=>null) : '')} className="px-3 py-2 border rounded">Paste from clipboard</button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Upload CSV / Excel</label>
          <input ref={fileInputRef} onChange={handleFile} type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
          <p className="text-sm text-gray-600">The uploader tries to detect a column named <em>URL</em> / <em>Link</em>. If not found it will use the first column.</p>

          <div className="mt-2">
            <label className="block text-sm font-medium">Optional CORS proxy (for status checks)</label>
            <input value={proxy} onChange={e=>setProxy(e.target.value)} className="w-full p-2 border rounded" placeholder="https://api.allorigins.win/raw?url=" />
            <p className="text-xs text-gray-500">If direct HEAD requests fail due to CORS, supply a proxy URL that accepts the target URL appended or encoded.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button onClick={checkAllStatuses} className="px-3 py-2 bg-green-600 text-white rounded">Check all statuses</button>
        <button onClick={exportCSV} className="px-3 py-2 border rounded">Export CSV</button>
        <button onClick={() => { setRows([]); }} className="px-3 py-2 border rounded">Clear</button>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="w-full table-auto">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">URL</th>
              <th className="p-2 text-left">Page Title</th>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Notes</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={(rows.findIndex(x=>x.url.toLowerCase()===r.url.toLowerCase())!==i) ? 'bg-yellow-50' : ''}>
                <td className="p-2 align-top">{i+1}</td>
                <td className="p-2 align-top max-w-xs break-words"><a href={r.url} target="_blank" rel="noreferrer" className="underline">{r.url}</a></td>
                <td className="p-2 align-top"><input value={r.title} onChange={e=>updateCell(i,'title',e.target.value)} className="p-1 border rounded w-48" /></td>
                <td className="p-2 align-top"><input value={r.category} onChange={e=>updateCell(i,'category',e.target.value)} className="p-1 border rounded w-32" /></td>
                <td className="p-2 align-top">{r.status}</td>
                <td className="p-2 align-top"><input value={r.notes} onChange={e=>updateCell(i,'notes',e.target.value)} className="p-1 border rounded w-56" /></td>
                <td className="p-2 align-top flex gap-2">
                  <button onClick={()=>checkStatus(i)} className="px-2 py-1 border rounded">Check</button>
                  <button onClick={()=>removeRow(i)} className="px-2 py-1 border rounded">Remove</button>
                </td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td colSpan={7} className="p-4 text-center text-gray-500">No URLs yet — paste, add or upload a file.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Notes:</strong> The built-in status check makes HEAD requests from the browser and may fail because many sites block cross-origin HEAD requests. If checks return <em>Error (CORS or network)</em>, try using a public proxy or deploy a simple server-side endpoint to perform checks.</p>
      </div>
    </div>
  );
}
