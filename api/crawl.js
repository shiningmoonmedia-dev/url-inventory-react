import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "Missing URL parameter" });
    }

    // Fetch page HTML
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (URL-Inventory-Tool)"
      }
    });

    // Load into Cheerio
    const $ = cheerio.load(data);
    let links = [];

    $("a").each((_, el) => {
      let href = $(el).attr("href");
      if (href && href.startsWith("http")) {
        links.push(href);
      }
    });

    // Remove duplicates
    links = [...new Set(links)];

    res.status(200).json({
      domain: url,
      totalLinks: links.length,
      links
    });

  } catch (err) {
    console.error("Crawl error:", err.message);
    res.status(500).json({ error: "Crawl failed", details: err.message });
  }
}
