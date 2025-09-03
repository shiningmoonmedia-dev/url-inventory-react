import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  try {
    // Fetch HTML
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (URL Inventory Tool)" },
    });

    // Parse HTML with cheerio
    const $ = cheerio.load(data);
    const links = [];

    $("a").each((_, el) => {
      let link = $(el).attr("href");
      if (link) {
        // Convert relative links to absolute
        if (link.startsWith("/")) {
          const base = new URL(url);
          link = `${base.origin}${link}`;
        }
        links.push(link);
      }
    });

    // Deduplicate
    const uniqueLinks = [...new Set(links)];

    res.status(200).json({ links: uniqueLinks });
  } catch (err) {
    console.error("Crawl error:", err.message);
    res.status(500).json({ error: "Failed to crawl domain" });
  }
}
