export interface EmailTemplate {
  id: string;
  label: string;
  subject: string;
  body: string;
}

// Variables disponibles: {{name}}, {{fullname}}, {{company}}, {{title}}
export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "cold-outreach",
    label: "Cold outreach",
    subject: "{{name}}, una idea rápida para {{company}}",
    body: `Hola {{name}},

Vi tu perfil y lo que están haciendo en {{company}} me llamó la atención.

Trabajo con equipos como el tuyo para [PROPUESTA DE VALOR]. ¿Tendrías 15 minutos esta semana para una llamada breve?

Saludos,
[TU NOMBRE]`,
  },
  {
    id: "follow-up",
    label: "Follow-up",
    subject: "Siguiendo nuestra conversación",
    body: `Hola {{name}},

Quería retomar el tema que conversamos sobre {{company}}.

¿Cómo lo ves? ¿Hay algo en lo que pueda apoyar para avanzar?

Saludos,
[TU NOMBRE]`,
  },
  {
    id: "proposal-reminder",
    label: "Recordatorio propuesta",
    subject: "Propuesta para {{company}}",
    body: `Hola {{name}},

Quería confirmar si tuviste oportunidad de revisar la propuesta que te envié.

Quedo atento a cualquier duda o feedback.

Saludos,
[TU NOMBRE]`,
  },
  {
    id: "re-engage",
    label: "Re-enganche",
    subject: "{{name}}, ¿retomamos?",
    body: `Hola {{name}},

Hace algunas semanas no nos comunicamos. ¿Cómo va todo en {{company}}?

Si sigue siendo prioridad para ustedes [TEMA], me encantaría retomar la conversación.

Saludos,
[TU NOMBRE]`,
  },
  {
    id: "meeting-request",
    label: "Solicitar reunión",
    subject: "15 min para hablar de {{company}}",
    body: `Hola {{name}},

¿Tendrías 15 minutos esta semana para una llamada rápida? Me gustaría entender mejor los retos actuales en {{company}} y ver si tiene sentido seguir conversando.

¿Te funciona mejor martes o jueves por la tarde?

Saludos,
[TU NOMBRE]`,
  },
];

export function fillTemplate(tmpl: string, vars: Record<string, string>): string {
  return tmpl.replace(/{{(\w+)}}/g, (_, k) => vars[k] || "");
}

export function buildMailto(email: string, templateId: string, vars: Record<string, string>): string {
  if (!templateId) return `mailto:${email}`;
  const tmpl = EMAIL_TEMPLATES.find(t => t.id === templateId);
  if (!tmpl) return `mailto:${email}`;
  const subject = fillTemplate(tmpl.subject, vars);
  const body = fillTemplate(tmpl.body, vars);
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
