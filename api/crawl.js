import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch site" });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let urls = new Set();

    $("a").each((_, el) => {
      let link = $(el).attr("href");
      if (link) {
        // Normalize relative URLs
        if (link.startsWith("/")) {
          link = new URL(link, url).href;
        }
        // Only keep internal links
        if (link.startsWith(url)) {
          urls.add(link.split("#")[0]); // remove anchors
        }
      }
    });

    res.status(200).json({ urls: Array.from(urls) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error crawling domain" });
  }
}
