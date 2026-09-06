import PDFDocument from "pdfkit";
import { Response } from "express";

export interface ReportEntryData {
  id: string;
  title?: string;
  category?: string;
  energyLevel?: number;
  moodTone?: number;
  mood?: string;
  mentalEnergy?: string;
  standoutMoment?: string;
  smallWin?: string;
  freeText?: string;
  initialPrompt?: string;
  summary?: string;
  keyInsights?: string[];
  createdAt?: string;
  updatedAt?: string;
  analysis?: {
    moodScore?: number;
    detectedMood?: string;
    themes?: string[];
    reflection?: string;
    gentleTip?: string;
    isStale?: boolean;
    timestamp?: string;
  };
}

export interface ReportConfig {
  displayName: string;
  range: "30d" | "90d" | "all";
  entries: ReportEntryData[];
}

/**
 * Sanitizes untrusted user text before inserting into PDFKit layouts.
 * Strips non-printable ASCII/control characters and trims excessive whitespace.
 */
export function sanitizePdfText(text: string | null | undefined, maxLength = 300): string {
  if (!text) return "";
  const cleaned = String(text)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, maxLength);
}

/**
 * Calculates aggregated statistics, top themes, and mood distribution from filtered entries.
 */
export function aggregateReportStats(entries: ReportEntryData[]) {
  const total = entries.length;
  let sumMood = 0;
  let sumEnergy = 0;
  let moodCount = 0;
  let energyCount = 0;

  const themeCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  const moodDistribution: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

  for (const entry of entries) {
    let m = entry.moodTone;
    if (typeof m !== "number" || m < 1 || m > 4) {
      if (entry.analysis?.moodScore && typeof entry.analysis.moodScore === "number") {
        m = Math.round(entry.analysis.moodScore);
      } else {
        m = 3;
      }
    }
    const clampedMood = Math.min(Math.max(Math.round(m), 1), 4) as 1 | 2 | 3 | 4;
    moodDistribution[clampedMood] = (moodDistribution[clampedMood] || 0) + 1;
    sumMood += clampedMood;
    moodCount++;

    if (typeof entry.energyLevel === "number" && entry.energyLevel >= 1 && entry.energyLevel <= 4) {
      sumEnergy += entry.energyLevel;
      energyCount++;
    }

    if (entry.category) {
      const cat = sanitizePdfText(entry.category, 40);
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    if (entry.analysis?.themes && Array.isArray(entry.analysis.themes)) {
      for (const t of entry.analysis.themes) {
        const theme = sanitizePdfText(t, 35);
        if (theme) {
          themeCounts[theme] = (themeCounts[theme] || 0) + 1;
        }
      }
    }
  }

  const avgMood = moodCount > 0 ? (sumMood / moodCount).toFixed(1) : "3.0";
  const avgEnergy = energyCount > 0 ? (sumEnergy / energyCount).toFixed(1) : "3.0";

  const topThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([theme, count]) => ({ theme, count }));

  // Find date span
  let startDateStr = "";
  let endDateStr = "";
  if (entries.length > 0) {
    const dates = entries
      .map(e => new Date(e.createdAt || e.updatedAt || 0).getTime())
      .filter(t => !isNaN(t) && t > 0)
      .sort((a, b) => a - b);
    if (dates.length > 0) {
      const fmt = (t: number) =>
        new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      startDateStr = fmt(dates[0]);
      endDateStr = fmt(dates[dates.length - 1]);
    }
  }

  return {
    total,
    avgMood,
    avgEnergy,
    topThemes,
    categoryCounts,
    moodDistribution,
    dateSpan: startDateStr && endDateStr ? `${startDateStr} — ${endDateStr}` : "Present Range"
  };
}

/**
 * Creates a thoughtful synthesized narrative summary from the aggregated metrics.
 */
function generateExecutiveSummary(
  stats: ReturnType<typeof aggregateReportStats>,
  displayName: string
): string {
  const avgMoodNum = parseFloat(stats.avgMood);
  const avgEnergyNum = parseFloat(stats.avgEnergy);

  let toneDesc = "steady and grounded";
  if (avgMoodNum >= 3.5) toneDesc = "predominantly lifted, bright, and forward-looking";
  else if (avgMoodNum >= 2.8) toneDesc = "centered, calm, and reflective";
  else if (avgMoodNum >= 2.0) toneDesc = "thoughtful, observant, and working through questions";
  else toneDesc = "honoring a period of quiet replenishment and rest";

  let energyDesc = "steady physical stamina";
  if (avgEnergyNum >= 3.5) energyDesc = "vibrant, inspired vitality";
  else if (avgEnergyNum >= 2.8) energyDesc = "grounded, resilient presence";
  else energyDesc = "gentle pacing that respects energetic reserves";

  const topThemesList = stats.topThemes.map(t => t.theme).slice(0, 3).join(", ");
  const themesPhrase = topThemesList ? `notably centered around ${topThemesList}` : "exploring personal mindfulness";

  return `Throughout this reflection period, ${displayName}'s journal records a total of ${stats.total} mindfulness entries. Overall emotional weather has remained ${toneDesc} (averaging ${stats.avgMood} of 4.0), accompanied by ${energyDesc} (averaging ${stats.avgEnergy} of 4.0). Thought patterns demonstrate high thematic coherence, ${themesPhrase}. Regular check-ins indicate a sustainable, unhurried cadence that honors quiet growth over reactive urgency.`;
}

/**
 * Mood Tier Palette Constants matching ReflectAI's botanical identity
 */
const COLOR_CHARCOAL = "#242728";
const COLOR_MUTED_INK = "#52595C";
const COLOR_SAND_BORDER = "#DCD5C9";
const COLOR_TERRACOTTA = "#BD7014"; // Sunlit Amber (Level 4)
const COLOR_MOSS_GREEN = "#2B6B55"; // Quiet Sage (Level 3)
const COLOR_HEATHER = "#6B5E7E";    // Dusk Heather (Level 2)
const COLOR_MIST = "#52595C";       // Slate Mist (Level 1)
const COLOR_BG_PANEL = "#F9F6F0";
const COLOR_BG_ACCENT = "#F4EFE6";

const MOOD_TIERS: Array<{
  level: 1 | 2 | 3 | 4;
  name: string;
  colorName: string;
  hex: string;
  title: string;
}> = [
  { level: 4, name: "Amber", colorName: "Sunlit Amber", hex: "#BD7014", title: "Lifted & Radiant" },
  { level: 3, name: "Sage", colorName: "Quiet Sage", hex: "#2B6B55", title: "Calm & Grounded" },
  { level: 2, name: "Heather", colorName: "Dusk Heather", hex: "#6B5E7E", title: "Pondering & Steady" },
  { level: 1, name: "Mist", colorName: "Slate Mist", hex: "#52595C", title: "Foggy & Resting" }
];

/**
 * Builds the PDFKit document with robust pagination and zero unnecessary blank pages.
 */
function buildReportDocument(config: ReportConfig): PDFKit.PDFDocument {
  const { displayName, range, entries } = config;
  const stats = aggregateReportStats(entries);
  const cleanName = sanitizePdfText(displayName, 60) || "Reflective Writer";
  const narrative = generateExecutiveSummary(stats, cleanName);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const contentWidth = pageWidth - 84; // 511.28

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 36, bottom: 30, left: 42, right: 42 },
    bufferPages: true,
    autoFirstPage: true,
    info: {
      Title: `ReflectAI Reflection Report — ${cleanName}`,
      Author: "ReflectAI Mindful Journal",
      Subject: "Personal Reflection & Mood History",
      CreationDate: new Date()
    }
  });

  let y = 40;

  // Space management helper: adds a page only when needed, never generating trailing blank pages
  const ensureSpace = (neededHeight: number) => {
    const maxY = pageHeight - 48; // Leaves comfortable room above the post-processed footer
    if (y + neededHeight > maxY) {
      doc.addPage();
      y = 40;
    }
  };

  // ==========================================
  // 1. TOP HEADER & MASTHEAD
  // ==========================================
  // Decorative concentric ripple ring marker
  doc.save();
  doc.circle(54, y + 10, 11).lineWidth(1.2).strokeColor(COLOR_MUTED_INK).stroke();
  doc.circle(54, y + 10, 7).lineWidth(1.2).strokeColor(COLOR_HEATHER).stroke();
  doc.circle(54, y + 10, 3.5).fillColor(COLOR_TERRACOTTA).fill();
  doc.restore();

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(COLOR_MUTED_INK)
    .text("REFLECTAI · MINDFUL JOURNAL ARCHIVE", 76, y - 2, { characterSpacing: 1.2, lineBreak: false });

  doc
    .font("Times-Bold")
    .fontSize(22)
    .fillColor(COLOR_CHARCOAL)
    .text("Personal Reflection & Mood Report", 76, y + 10, { lineBreak: false });

  const rangeLabel = range === "30d" ? "Last 30 Days" : range === "90d" ? "Last 90 Days" : "All-Time Journal Archive";
  doc
    .font("Times-Italic")
    .fontSize(10)
    .fillColor(COLOR_TERRACOTTA)
    .text(`${rangeLabel} · ${stats.dateSpan}`, 76, y + 36, { lineBreak: false });

  y += 58;

  // Subtle horizontal rule
  doc
    .moveTo(42, y)
    .lineTo(pageWidth - 42, y)
    .lineWidth(1)
    .strokeColor(COLOR_SAND_BORDER)
    .stroke();

  y += 12;

  // User Context Ribbon
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLOR_MUTED_INK)
    .text("Prepared for: ", 44, y, { continued: true, lineBreak: false })
    .font("Helvetica-Bold")
    .fillColor(COLOR_CHARCOAL)
    .text(cleanName, { continued: true, lineBreak: false })
    .font("Helvetica")
    .fillColor(COLOR_MUTED_INK)
    .text(`   ·   Generated: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}   ·   Status: Encrypted & Private`, { lineBreak: false });

  y += 20;

  // ==========================================
  // 2. KEY METRICS STAT CARDS (4-column grid)
  // ==========================================
  ensureSpace(64);
  const cardW = (contentWidth - 18) / 4;
  const cardH = 50;

  const statCards = [
    { label: "TOTAL REFLECTIONS", value: `${stats.total}`, sub: `${rangeLabel}`, color: COLOR_CHARCOAL },
    { label: "AVERAGE MOOD", value: `${stats.avgMood}`, sub: "Scale of 1 to 4", color: COLOR_TERRACOTTA },
    { label: "AVERAGE ENERGY", value: `${stats.avgEnergy}`, sub: "Scale of 1 to 4", color: COLOR_MOSS_GREEN },
    { label: "TOP FOCUS THEME", value: stats.topThemes[0]?.theme || "Reflective", sub: `${stats.topThemes[0]?.count || stats.total} entries`, color: COLOR_HEATHER }
  ];

  statCards.forEach((card, i) => {
    const cx = 42 + i * (cardW + 6);
    doc
      .roundedRect(cx, y, cardW, cardH, 3)
      .fillColor(COLOR_BG_PANEL)
      .strokeColor(COLOR_SAND_BORDER)
      .lineWidth(0.8)
      .fillAndStroke();

    doc
      .font("Helvetica")
      .fontSize(6.5)
      .fillColor(COLOR_MUTED_INK)
      .text(card.label, cx + 8, y + 6, { width: cardW - 16, lineBreak: false });

    doc
      .font("Times-Bold")
      .fontSize(15)
      .fillColor(card.color)
      .text(card.value, cx + 8, y + 16, { width: cardW - 16, lineBreak: false });

    doc
      .font("Times-Italic")
      .fontSize(7)
      .fillColor(COLOR_MUTED_INK)
      .text(card.sub, cx + 8, y + 34, { width: cardW - 16, lineBreak: false });
  });

  y += cardH + 20;

  // ==========================================
  // 3. MOOD PROPORTION PIE CHART (Task 3)
  // Uses the existing mood-gradient palette:
  // Slate Mist (#52595C), Dusk Heather (#6B5E7E), Quiet Sage (#2B6B55), Sunlit Amber (#BD7014)
  // ==========================================
  ensureSpace(140);
  doc
    .font("Times-Bold")
    .fontSize(12)
    .fillColor(COLOR_CHARCOAL)
    .text("Overall Mood Distribution & Proportions", 42, y, { lineBreak: false });

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLOR_MUTED_INK)
    .text("Proportion of recorded check-ins across emotional weather tiers for this period.", 42, y + 14, { lineBreak: false });

  y += 28;

  // Draw Pie Chart Container Panel
  const piePanelHeight = 100;
  doc
    .roundedRect(42, y, contentWidth, piePanelHeight, 4)
    .fillColor(COLOR_BG_PANEL)
    .strokeColor(COLOR_SAND_BORDER)
    .lineWidth(0.8)
    .fillAndStroke();

  // Vector Pie Chart geometry
  const pieCenterX = 110;
  const pieCenterY = y + piePanelHeight / 2;
  const pieRadius = 38;
  const donutHoleRadius = 18;

  const totalEntries = stats.total;
  let currentAngle = -Math.PI / 2; // Start from top (12 o'clock)

  if (totalEntries > 0) {
    // Slices in order: Sunlit Amber (4), Quiet Sage (3), Dusk Heather (2), Slate Mist (1)
    for (const tier of MOOD_TIERS) {
      const count = stats.moodDistribution[tier.level];
      if (count > 0) {
        const sliceFraction = count / totalEntries;
        const sliceAngle = sliceFraction * 2 * Math.PI;
        const endAngle = currentAngle + sliceAngle;

        doc.save();
        if (count === totalEntries) {
          // 100% in one category: full circle
          doc.circle(pieCenterX, pieCenterY, pieRadius).fillColor(tier.hex).fill();
        } else {
          // Arc slice from currentAngle to endAngle via SVG path
          const startX = pieCenterX + pieRadius * Math.cos(currentAngle);
          const startY = pieCenterY + pieRadius * Math.sin(currentAngle);
          const endX = pieCenterX + pieRadius * Math.cos(endAngle);
          const endY = pieCenterY + pieRadius * Math.sin(endAngle);
          const largeArc = sliceAngle > Math.PI ? 1 : 0;
          const slicePath = `M ${pieCenterX.toFixed(1)} ${pieCenterY.toFixed(1)} L ${startX.toFixed(1)} ${startY.toFixed(1)} A ${pieRadius} ${pieRadius} 0 ${largeArc} 1 ${endX.toFixed(1)} ${endY.toFixed(1)} Z`;
          doc.path(slicePath).fillColor(tier.hex).fill();
        }
        doc.restore();
        currentAngle = endAngle;
      }
    }

    // Inner Donut Cutout
    doc.save();
    doc.circle(pieCenterX, pieCenterY, donutHoleRadius).fillColor(COLOR_BG_PANEL).fill();
    doc.circle(pieCenterX, pieCenterY, donutHoleRadius).lineWidth(0.5).strokeColor(COLOR_SAND_BORDER).stroke();
    doc.restore();

    // Center Label: Total entries count
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(COLOR_CHARCOAL)
      .text(`${totalEntries}`, pieCenterX - 18, pieCenterY - 6, { width: 36, align: "center", lineBreak: false });
    doc
      .font("Helvetica")
      .fontSize(5.5)
      .fillColor(COLOR_MUTED_INK)
      .text("DAYS", pieCenterX - 18, pieCenterY + 5, { width: 36, align: "center", lineBreak: false });
  } else {
    // Empty ring placeholder
    doc.save();
    doc.circle(pieCenterX, pieCenterY, pieRadius).lineWidth(1).strokeColor(COLOR_SAND_BORDER).stroke();
    doc.restore();
    doc
      .font("Times-Italic")
      .fontSize(8)
      .fillColor(COLOR_MUTED_INK)
      .text("No entries", pieCenterX - 25, pieCenterY - 4, { width: 50, align: "center", lineBreak: false });
  }

  // Legend on right side of pie chart (2x2 grid)
  const legendStartX = 185;
  const colWidth = (contentWidth - 160) / 2;

  MOOD_TIERS.forEach((tier, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const lx = legendStartX + col * colWidth;
    const ly = y + 16 + row * 38;

    const count = stats.moodDistribution[tier.level];
    const pct = totalEntries > 0 ? Math.round((count / totalEntries) * 100) : 0;

    // Color Swatch Pill
    doc.save();
    doc.roundedRect(lx, ly, 10, 10, 2).fillColor(tier.hex).fill();
    doc.restore();

    // Tier Title & Color Name
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(COLOR_CHARCOAL)
      .text(`${tier.colorName} · ${tier.title}`, lx + 16, ly - 1, { width: colWidth - 20, lineBreak: false });

    // Days Count & Percentage Breakdown
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(COLOR_MUTED_INK)
      .text(`${count} day${count === 1 ? "" : "s"} (${pct}% of period)`, lx + 16, ly + 11, { width: colWidth - 20, lineBreak: false });
  });

  y += piePanelHeight + 18;

  // ==========================================
  // 4. TOP THEMES & REFLECTIVE FOCUS
  // ==========================================
  ensureSpace(60);
  doc
    .font("Times-Bold")
    .fontSize(12)
    .fillColor(COLOR_CHARCOAL)
    .text("Recurring Mindful Themes", 42, y, { lineBreak: false });

  y += 16;

  if (stats.topThemes.length > 0) {
    const themeColWidth = (contentWidth - 12) / 3;
    const rowCount = Math.ceil(Math.min(stats.topThemes.length, 6) / 3);

    stats.topThemes.slice(0, 6).forEach((item, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const tx = 42 + col * (themeColWidth + 6);
      const ty = y + row * 26;

      doc
        .roundedRect(tx, ty, themeColWidth, 22, 3)
        .fillColor(COLOR_BG_PANEL)
        .strokeColor(COLOR_SAND_BORDER)
        .lineWidth(0.6)
        .fillAndStroke();

      doc
        .font("Times-Italic")
        .fontSize(9)
        .fillColor(COLOR_CHARCOAL)
        .text(item.theme, tx + 8, ty + 5, { width: themeColWidth - 34, ellipsis: true, lineBreak: false });

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLOR_TERRACOTTA)
        .text(`${item.count}x`, tx + themeColWidth - 26, ty + 6, { width: 20, align: "right", lineBreak: false });
    });

    y += rowCount * 26 + 12;
  } else {
    doc
      .font("Times-Italic")
      .fontSize(9)
      .fillColor(COLOR_MUTED_INK)
      .text("Continue reflecting to build custom thematic patterns over time.", 42, y, { lineBreak: false });
    y += 20;
  }

  // ==========================================
  // 5. EXECUTIVE SYNTHESIS & REFLECTIVE SUMMARY
  // ==========================================
  ensureSpace(75);
  doc
    .font("Times-Bold")
    .fontSize(12)
    .fillColor(COLOR_CHARCOAL)
    .text("Executive Reflection Synthesis", 42, y, { lineBreak: false });

  y += 16;

  const summaryBoxHeight = 54;
  doc
    .roundedRect(42, y, contentWidth, summaryBoxHeight, 4)
    .fillColor(COLOR_BG_ACCENT)
    .strokeColor(COLOR_SAND_BORDER)
    .lineWidth(0.8)
    .fillAndStroke();

  doc
    .font("Times-Roman")
    .fontSize(8.8)
    .fillColor(COLOR_CHARCOAL)
    .text(narrative, 52, y + 8, {
      width: contentWidth - 20,
      lineGap: 2.2,
      align: "justify"
    });

  y += summaryBoxHeight + 18;

  // ==========================================
  // 6. STANDOUT MOMENTS & SMALL WINS ARCHIVE
  // ==========================================
  // Chronological sort
  const chronEntries = [...entries].sort((a, b) => 
    new Date(a.createdAt || a.updatedAt || 0).getTime() - new Date(b.createdAt || b.updatedAt || 0).getTime()
  );

  const highlights = chronEntries
    .filter(e => e.standoutMoment || e.smallWin)
    .slice(-4)
    .reverse();

  ensureSpace(highlights.length > 0 ? 60 : 30);

  doc
    .font("Times-Bold")
    .fontSize(12)
    .fillColor(COLOR_CHARCOAL)
    .text("Selected Standout Moments & Small Wins", 42, y, { lineBreak: false });

  y += 16;

  if (highlights.length > 0) {
    highlights.forEach(item => {
      ensureSpace(32);

      const itemDate = new Date(item.createdAt || item.updatedAt || 0).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      });

      const winText = sanitizePdfText(item.smallWin || item.standoutMoment || "", 180);
      const momentText = item.smallWin && item.standoutMoment ? sanitizePdfText(item.standoutMoment, 180) : "";

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLOR_TERRACOTTA)
        .text(itemDate, 44, y, { width: 44, lineBreak: false });

      doc
        .font("Times-Roman")
        .fontSize(8.5)
        .fillColor(COLOR_CHARCOAL)
        .text(`“${winText}”`, 92, y, { width: contentWidth - 54 });

      y += 16;

      if (momentText) {
        doc
          .font("Times-Italic")
          .fontSize(8)
          .fillColor(COLOR_MUTED_INK)
          .text(`Standout detail: ${momentText}`, 92, y, { width: contentWidth - 54 });
        y += 13;
      }
    });
  } else {
    doc
      .font("Times-Italic")
      .fontSize(9)
      .fillColor(COLOR_MUTED_INK)
      .text("No specific standout moments recorded in this date range.", 42, y, { lineBreak: false });
    y += 18;
  }

  // ==========================================
  // 7. FOOTERS (POST-PROCESSED ACROSS ALL BUFFERED PAGES)
  // Guarantees zero trailing or interstitial blank pages!
  // ==========================================
  const { count } = doc.bufferedPageRange();
  for (let i = 0; i < count; i++) {
    doc.switchToPage(i);
    const origBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // Prevent PDFKit line wrapper from triggering automatic page breaks

    const footerY = pageHeight - 26;

    doc
      .moveTo(42, footerY - 6)
      .lineTo(pageWidth - 42, footerY - 6)
      .lineWidth(0.5)
      .strokeColor(COLOR_SAND_BORDER)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(COLOR_MUTED_INK)
      .text("ReflectAI · Private & Confidential Personal Record · Generated on-demand", 42, footerY, {
        width: contentWidth / 2,
        lineBreak: false
      });

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(COLOR_MUTED_INK)
      .text(`Page ${i + 1} of ${count} · Encrypted Storage`, pageWidth - 42 - (contentWidth / 2), footerY, {
        width: contentWidth / 2,
        align: "right",
        lineBreak: false
      });

    doc.page.margins.bottom = origBottom;
  }

  return doc;
}

/**
 * Streams the generated PDF report directly to the HTTP response.
 */
export function streamJournalReportPdf(
  res: Response,
  config: ReportConfig
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = buildReportDocument(config);
      doc.pipe(res);
      doc.on("end", () => resolve());
      doc.on("error", (err) => reject(err));
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generates the PDF report as an in-memory Buffer for email export.
 */
export function generateJournalReportPdfBuffer(config: ReportConfig): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = buildReportDocument(config);
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
