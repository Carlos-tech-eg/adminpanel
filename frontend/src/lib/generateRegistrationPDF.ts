import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const GREEN = [0, 120, 60] as const;
const DARK = [30, 30, 30] as const;
const GRAY = [100, 100, 100] as const;
const LIGHT_GRAY = [200, 200, 200] as const;
const WHITE = [255, 255, 255] as const;
const RED = [200, 40, 40] as const;
const BLUE = [0, 100, 180] as const;

const PAGE_W = 210;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

type RegistrationRow = {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  passportNo?: string;
  city?: string;
  country?: string;
  status: string;
  notes?: string;
  referenceCode?: string;
  createdAt?: string;
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function parseNotesField(notes: string) {
  const map: Record<string, string> = {};
  for (const line of notes.split("\n")) {
    const m = line.match(/^([^:]+):\s*(.+)$/);
    if (m) map[m[1].trim()] = m[2].trim();
  }
  return map;
}

function drawFlag(doc: jsPDF, x: number, y: number, w: number, h: number) {
  const stripe = h / 3;
  doc.setFillColor(...GREEN);
  doc.rect(x, y, w, stripe, "F");
  doc.setFillColor(...WHITE);
  doc.rect(x, y + stripe, w, stripe, "F");
  doc.setFillColor(...RED);
  doc.rect(x, y + stripe * 2, w, stripe, "F");
  doc.setFillColor(...BLUE);
  doc.triangle(x, y, x, y + h, x + w * 0.3, y + h / 2, "F");

  const cx = x + w / 2;
  const cy = y + h / 2;
  const sw = w * 0.28;
  const sh = h * 0.32;
  doc.setFillColor(210, 190, 130);
  doc.roundedRect(cx - sw / 2, cy - sh / 2, sw, sh, 1, 1, "F");
  doc.setDrawColor(100, 80, 40);
  doc.setLineWidth(0.2);
  doc.roundedRect(cx - sw / 2, cy - sh / 2, sw, sh, 1, 1, "S");
  doc.setFillColor(34, 120, 60);
  const tw = sw * 0.2;
  doc.rect(cx - tw / 2, cy - sh / 2 - 3, tw, 3, "F");
  doc.setFillColor(34, 120, 60);
  doc.circle(cx, cy - sh / 2 - 3.5, 1.5, "F");
}

function sectionHeader(doc: jsPDF, y: number, num: number, title: string) {
  doc.setFillColor(...GREEN);
  doc.rect(MARGIN, y, CONTENT_W, 7, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`${num}. ${title}`, MARGIN + 3, y + 5);
  doc.setTextColor(...DARK);
  return y + 9;
}

function labelValue(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  labelW = 50
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`: ${value || "—"}`, x + labelW, y);
}

export function generateRegistrationPDF(row: RegistrationRow) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const parsed = row.notes ? parseNotesField(row.notes) : {};

  const ref = row.referenceCode || `REG-${row._id.slice(-8).toUpperCase()}`;

  /* ====== TOP BADGE ====== */
  const badgeW = 52;
  const badgeH = 14;
  const badgeX = PAGE_W - MARGIN - badgeW;
  const badgeY = 8;
  doc.setFillColor(...GREEN);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2, 2, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("NÚMERO DE EXPEDIENTE", badgeX + badgeW / 2, badgeY + 4.5, {
    align: "center",
  });
  doc.setFontSize(10);
  doc.text(ref, badgeX + badgeW / 2, badgeY + 11, {
    align: "center",
  });

  /* ====== FLAG ====== */
  drawFlag(doc, MARGIN, 10, 24, 16);

  /* ====== TITLE ====== */
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("EMBAJADA DE GUINEA ECUATORIAL EN TÜRKIYE", PAGE_W / 2, 34, {
    align: "center",
  });
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text("FORMULARIO DE PRE-REGISTRO CONSULAR", PAGE_W / 2, 40, {
    align: "center",
  });
  doc.setFontSize(8);
  doc.text("SOLICITUD DE REGISTRO", PAGE_W / 2, 45, {
    align: "center",
  });

  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 48, PAGE_W - MARGIN, 48);

  /* ====== SECTION 1 ====== */
  let y = sectionHeader(doc, 51, 1, "INFORMACIÓN PERSONAL");
  const col1X = MARGIN + 3;
  const col2V = 50;
  const lineH = 5.5;

  const photoW = 28;
  const photoH = 35;
  const photoX = PAGE_W - MARGIN - photoW - 2;
  const photoY = y + 1;
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setFillColor(245, 245, 245);
  doc.rect(photoX, photoY, photoW, photoH, "FD");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text("FOTO", photoX + photoW / 2, photoY + photoH / 2, {
    align: "center",
  });
  doc.rect(photoX - 1, photoY - 1, photoW + 2, photoH + 2, "S");

  labelValue(doc, col1X, y + 2, "Nombre completo", row.fullName, col2V);
  y += lineH;
  labelValue(
    doc,
    col1X,
    y + 2,
    "Fecha de nacimiento",
    parsed["Nacimiento"] || "—",
    col2V
  );
  y += lineH;
  labelValue(
    doc,
    col1X,
    y + 2,
    "Nacionalidad",
    parsed["Nacionalidad"] || "Guineana",
    col2V
  );
  y += lineH;
  labelValue(
    doc,
    col1X,
    y + 2,
    "Número de pasaporte",
    row.passportNo || "—",
    col2V
  );
  y += lineH;
  labelValue(
    doc,
    col1X,
    y + 2,
    "Sexo",
    parsed["Sexo"] || "—",
    col2V
  );
  y += lineH;
  labelValue(doc, col1X, y + 2, "Teléfono", row.phone || "—", col2V);
  y += lineH;
  labelValue(doc, col1X, y + 2, "Correo electrónico", row.email, col2V);
  y += lineH;
  labelValue(
    doc,
    col1X,
    y + 2,
    "Dirección",
    parsed["Dirección"] || parsed["Direccion"] || "—",
    col2V
  );
  y += lineH;
  labelValue(doc, col1X, y + 2, "Ciudad", row.city || "—", col2V);
  y += lineH;
  labelValue(doc, col1X, y + 2, "País", row.country || "Türkiye", col2V);
  y += lineH + 3;

  /* ====== SECTION 2 ====== */
  y = sectionHeader(doc, y, 2, "INFORMACIÓN COMPLEMENTARIA");
  labelValue(
    doc,
    col1X,
    y + 2,
    "Estado civil",
    parsed["Estado civil"] || "—",
    col2V
  );
  y += lineH;
  labelValue(
    doc,
    col1X,
    y + 2,
    "Ocupación",
    parsed["Ocupación"] || parsed["Ocupacion"] || "—",
    col2V
  );
  y += lineH;
  labelValue(
    doc,
    col1X,
    y + 2,
    "Empleador / Centro",
    parsed["Empleador"] || "—",
    col2V
  );
  y += lineH;

  const docLine = parsed["Documento"] || "";
  const docType = docLine.includes("Pasaporte")
    ? "Pasaporte"
    : docLine.includes("Cédula")
      ? "Cédula"
      : docLine || "Pasaporte";
  labelValue(doc, col1X, y + 2, "Tipo de documento", docType, col2V);
  y += lineH + 3;

  /* ====== SECTION 3 ====== */
  y = sectionHeader(doc, y, 3, "CONTACTO DE EMERGENCIA");

  const emergencyLine = parsed[""] || "";
  const emergencyName =
    row.notes?.match(
      /Contacto emergencia:\n([^\n]+)/
    )?.[1] || emergencyLine || "—";

  labelValue(doc, col1X, y + 2, "Contacto", emergencyName, col2V);
  y += lineH + 3;

  /* ====== SECTION 4 ====== */
  y = sectionHeader(doc, y, 4, "DOCUMENTOS PRESENTADOS");

  const documents = [
    "Copia del pasaporte",
    "Fotografía tipo pasaporte",
    "Formulario de pre-registro completado",
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["N°", "DOCUMENTO", "ESTADO"]],
    body: documents.map((d, i) => [
      String(i + 1),
      d,
      "\u2713   Presentado",
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [200, 200, 200],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [30, 30, 30],
      fontStyle: "bold",
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" as const },
      1: { cellWidth: "auto" },
      2: {
        cellWidth: 36,
        halign: "center" as const,
        textColor: [0, 120, 60],
      },
    },
    theme: "grid",
  });

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y + 30;
  y = finalY + 6;

  /* ====== SECTION 5 ====== */
  y = sectionHeader(doc, y, 5, "DECLARACIÓN");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...DARK);
  const declText =
    "Declaro que la información proporcionada en este formulario es " +
    "verdadera, completa y exacta. Me comprometo a cumplir con " +
    "las leyes y regulaciones de la República de Guinea Ecuatorial " +
    "y de la República de Türkiye.";
  const declLines = doc.splitTextToSize(declText, CONTENT_W * 0.55);
  doc.text(declLines, col1X, y + 2);

  const declH = declLines.length * 3.5;
  const sigY = y + declH + 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text("Firma del solicitante", col1X, sigY);
  doc.setDrawColor(...DARK);
  doc.setLineWidth(0.3);
  doc.line(col1X, sigY + 12, col1X + 55, sigY + 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...DARK);
  doc.text(row.fullName, col1X, sigY + 16);

  const codeX = PAGE_W - MARGIN - 50;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY);
  doc.text("CÓDIGO DE VERIFICACIÓN", codeX, sigY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  const verCode = ref.replace(/-/g, "").slice(0, 12);
  doc.text(verCode, codeX, sigY + 5);

  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(`Fecha: ${fmtDate(row.createdAt)}`, col1X, sigY + 22);

  /* ====== STATUS STAMP ====== */
  if (row.status === "Registered") {
    doc.setFontSize(22);
    doc.setTextColor(0, 140, 60);
    doc.setFont("helvetica", "bold");
    doc.text("REGISTRADO", PAGE_W / 2, sigY + 10, {
      align: "center",
      angle: 15,
    });
  }

  /* ====== FOOTER ====== */
  const footY = 274;
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, footY, PAGE_W - MARGIN, footY);

  doc.setFontSize(5.5);
  doc.setTextColor(...GRAY);
  doc.text(
    "Conserve su número de expediente para futuras consultas sobre el estado de su solicitud.",
    PAGE_W / 2,
    footY + 4,
    { align: "center" }
  );

  const footInfoY = footY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.text("Dirección:", MARGIN, footInfoY);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Kavaklıdere Mah. Atatürk Bulvarı No: 149",
    MARGIN + 14,
    footInfoY
  );
  doc.text("Çankaya / Ankara - Türkiye", MARGIN + 14, footInfoY + 3);

  const midX = PAGE_W / 2 - 10;
  doc.setFont("helvetica", "bold");
  doc.text("Teléfono:", midX, footInfoY);
  doc.setFont("helvetica", "normal");
  doc.text("+90 312 466 46 80", midX + 14, footInfoY);
  doc.setFont("helvetica", "bold");
  doc.text("Fax:", midX, footInfoY + 3);
  doc.setFont("helvetica", "normal");
  doc.text("+90 312 466 46 81", midX + 7, footInfoY + 3);

  const rX = PAGE_W - MARGIN - 44;
  doc.setFont("helvetica", "bold");
  doc.text("Correo electrónico:", rX, footInfoY);
  doc.setFont("helvetica", "normal");
  doc.text("embajada@guineaecuatorial.org.tr", rX + 24, footInfoY);
  doc.setFont("helvetica", "bold");
  doc.text("Sitio web:", rX, footInfoY + 3);
  doc.setFont("helvetica", "normal");
  doc.text("www.guineaecuatorial.org.tr", rX + 12, footInfoY + 3);

  return doc;
}
