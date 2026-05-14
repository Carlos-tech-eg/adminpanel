const { NewsArticle } = require("../models/NewsArticle");
const { VisaApplication } = require("../models/VisaApplication");
const { Appointment } = require("../models/Appointment");

async function seedDemoContentIfEmpty() {
  const [n, v, a] = await Promise.all([
    NewsArticle.countDocuments(),
    VisaApplication.countDocuments(),
    Appointment.countDocuments(),
  ]);

  if (n + v + a > 0) {
    return { seeded: false };
  }

  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);

  await NewsArticle.insertMany([
    {
      title: "La Embajada refuerza la atención consular en Ankara",
      excerpt: "Nuevo calendario de citas y canales de contacto para la comunidad.",
      content: "<p>Contenido de ejemplo para el panel administrativo.</p>",
      dateLabel: new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }),
      badgeLabel: "Noticia",
      badgeTone: "green",
      imageUrl: "/images/reunion.jpg",
      published: true,
      sortOrder: 10,
    },
    {
      title: "Visados: documentación recomendada",
      excerpt: "Checklist orientativa para solicitudes de visado.",
      content: "<p>Lista de documentos…</p>",
      dateLabel: new Date().toLocaleDateString("es-ES"),
      badgeLabel: "Aviso importante",
      badgeTone: "red",
      imageUrl: "/images/pasaportes.webp",
      published: true,
      sortOrder: 5,
    },
  ]);

  await VisaApplication.insertMany([
    {
      applicantName: "María Ejemplo",
      email: "maria.ejemplo@example.com",
      phone: "+90 555 000 0000",
      passportNo: "P1234567",
      nationality: "Guinea Ecuatorial",
      visaType: "Tourist",
      status: "In review",
      notes: "",
    },
    {
      applicantName: "Juan Demo",
      email: "juan.demo@example.com",
      visaType: "Business",
      status: "Received",
      notes: "",
    },
  ]);

  await Appointment.insertMany([
    {
      fullName: "Pedro Cita",
      email: "pedro.cita@example.com",
      phone: "+90 555 444 5566",
      serviceType: "Visa",
      scheduledAt: in7,
      durationMins: 30,
      status: "Pending",
      internalNotes: "Primera visita",
    },
  ]);

  return { seeded: true, message: "Demo news, visas & appointments inserted (consular: solo datos reales del sitio)" };
}

module.exports = { seedDemoContentIfEmpty };
