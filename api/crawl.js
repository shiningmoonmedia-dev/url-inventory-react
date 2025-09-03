import fetch from "node-fetch";
import * as cheerio from "cheerio";

const MAX_DEPTH = 2; // Change this if you want deeper crawling
const MAX_URLS = 200; // Safety limit so it doesn’t crawl infinitely

async function crawlPage(baseUrl, currentUrl, depth, visited) {
  if (depth > MAX_DEPTH || visited.size >= MAX_URLS) return;

  try {
    const response = await fetch(currentUrl);
    if (!response.ok) return;

    const html = await response.text();
    const $ = cheerio.load(html);

    $("a").each((_, el) => {
      let link = $(el).attr("href");
      if (link) {
        if (link.startsWith("/")) {
          link = new URL(link, baseUrl).href;
        }
        if (link.startsWith(baseUrl) && !visited.has(link)) {
          visited.add(link.split("#")[0]); // Remove anchors
        }
      }
    });

    // Crawl newly found links (depth + 1)
    for (let link of Array.from(visited)) {
      if (!visited.has(link)) {
        await crawlPage(baseUrl, link, depth + 1, visited);
      }
    }
  } catch (err) {
    console.error("Crawl error at:", currentUrl, err.message);
  }
}

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  try {
    const visited = new Set();
    visited.add(url);

    await crawlPage(url, url, 0, visited);

    res.status(200).json({ urls: Array.from(visited) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error crawling domain" });
  }
}
