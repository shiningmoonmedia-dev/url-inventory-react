import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  try {
    // Fetch with more forgiving settings
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (URL Inventory Tool)" },
      timeout: 8000, // 8 seconds max
      maxRedirects: 5,
      validateStatus: () => true, // don't throw on 4xx/5xx
    });

    if (response.status >= 400) {
      return res
        .status(500)
        .json({ error: `Failed to fetch page. Status: ${response.status}` });
    }

    // Load into cheerio
    const $ = cheerio.load(response.data);
    const links = [];

    $("a").each((_, el) => {
      let link = $(el).attr("href");
      if (link) {
        // Fix relative links
        if (link.startsWith("/")) {
          const base = new URL(url);
          link = `${base.origin}${link}`;
        }
        // Skip mailto, tel, javascript links
        if (!link.startsWith("mailto:") && !link.startsWith("tel:") && !link.startsWith("javascript:")) {
          links.push(link);
        }
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
