import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";

/* ============================================================
   EMPLOYMENT VALIDATION
============================================================ */

export const hasOverlap = (index, employment = []) => {
  if (!Array.isArray(employment) || !employment[index]) return false;

  const job = employment[index];
  if (!job || !job.from || !job.to || job.current) return false;

  const [fm, fy] = job.from.split("-");
  const [tm, ty] = job.to.split("-");

  const start = new Date(`${fy}-${fm}-01`);
  const end = new Date(`${ty}-${tm}-01`);

  return employment.some((other, i) => {
    if (
      i === index ||
      !other ||
      !other.from ||
      !other.to ||
      other.current
    )
      return false;

    const [ofm, ofy] = other.from.split("-");
    const [otm, oty] = other.to.split("-");

    const oStart = new Date(`${ofy}-${ofm}-01`);
    const oEnd = new Date(`${oty}-${otm}-01`);

    return start <= oEnd && end >= oStart;
  });
};

/* ============================================================
   PDF GENERATION (Enterprise Clean Layout)
============================================================ */

export const generatePDF = (application) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Application Form", 20, 20);

  doc.setFontSize(12);

  let y = 40;

  Object.entries(application).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    doc.text(`${formatKey(key)}: ${value}`, 20, y);
    y += 8;

    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save(`Application-${application.appNumber || "Form"}.pdf`);
};

/* ============================================================
   DOCX GENERATION (Proper Structured Document)
============================================================ */

export const generateDOC = async (application) => {
  const children = [
    new Paragraph({
      children: [
        new TextRun({
          text: "Application Form",
          bold: true,
          size: 32,
        }),
      ],
    }),
  ];

  Object.entries(application).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${formatKey(key)}: ${value}`,
          }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Application-${application.appNumber || "Form"}.docx`);
};

/* ============================================================
   UTIL
============================================================ */

const formatKey = (key) => {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
};