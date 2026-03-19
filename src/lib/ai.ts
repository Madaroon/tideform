import { generateFieldId } from "@/lib/utils";
import type { AIGenerateResponse } from "@/lib/types";

// ─── AI Form Generation ─────────────────────────────────────────────────────
// Uses Anthropic Claude API when available, falls back to smart templates.

const SYSTEM_PROMPT = `You are Tideform AI, an expert form designer. Given a description, generate a professional form.

Respond ONLY with valid JSON in this exact format:
{
  "title": "Form Title",
  "description": "Brief description",
  "fields": [
    {
      "type": "short_text|long_text|email|number|phone|url|select|multi_select|rating|scale|yes_no|date|file",
      "label": "Question text",
      "description": "Optional helper text",
      "required": true/false,
      "options": ["only for select/multi_select types"],
      "validation": {},
      "settings": {}
    }
  ]
}

Guidelines:
- Keep forms concise (4-8 fields for simple forms, up to 12 for complex ones)
- Put easy fields first (name, email) and hard questions last
- Use appropriate field types (rating for satisfaction, scale for NPS, select for categories)
- Mark genuinely essential fields as required, not everything
- Write clear, friendly question labels
- Add descriptions only when the question might be ambiguous
- For select/multi_select, provide 3-6 realistic options
- End with a long_text field for open feedback when appropriate`;

export async function generateFormWithAI(
  prompt: string,
  apiKey?: string
): Promise<AIGenerateResponse> {
  // Try Anthropic API first
  if (apiKey) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content[0]?.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            title: parsed.title || "Generated Form",
            description: parsed.description || "",
            fields: parsed.fields.map((f: any) => ({
              ...f,
              options: f.options || [],
              validation: f.validation || {},
              settings: f.settings || {},
            })),
          };
        }
      }
    } catch (error) {
      console.error("AI generation failed, falling back to templates:", error);
    }
  }

  // Fallback: smart template matching
  return generateFromTemplate(prompt);
}

// ─── Template Fallback ───────────────────────────────────────────────────────

const TEMPLATES: Record<string, AIGenerateResponse> = {
  feedback: {
    title: "Customer Feedback",
    description: "We'd love to hear about your experience. Takes 2 minutes.",
    fields: [
      { type: "rating", label: "How would you rate your overall experience?", required: true, options: [], validation: {}, settings: {} },
      { type: "select", label: "Which product or service did you use?", required: true, options: ["Product A", "Product B", "Product C", "Service", "Other"], validation: {}, settings: {} },
      { type: "scale", label: "How likely are you to recommend us to a friend? (1-10)", required: true, options: [], validation: {}, settings: {} },
      { type: "multi_select", label: "What did you like most?", required: false, options: ["Quality", "Speed", "Price", "Customer support", "Ease of use"], validation: {}, settings: {} },
      { type: "long_text", label: "Any suggestions for improvement?", required: false, options: [], validation: {}, settings: {} },
      { type: "email", label: "Email (optional — for follow-up)", required: false, options: [], validation: {}, settings: {} },
    ],
  },
  job: {
    title: "Job Application",
    description: "We're excited you're interested in joining our team!",
    fields: [
      { type: "short_text", label: "Full name", required: true, options: [], validation: {}, settings: {} },
      { type: "email", label: "Email address", required: true, options: [], validation: {}, settings: {} },
      { type: "phone", label: "Phone number", required: true, options: [], validation: {}, settings: {} },
      { type: "select", label: "Which role are you applying for?", required: true, options: ["Software Engineer", "Product Designer", "Product Manager", "Marketing", "Sales", "Other"], validation: {}, settings: {} },
      { type: "url", label: "LinkedIn or portfolio URL", required: false, options: [], validation: {}, settings: {} },
      { type: "select", label: "Years of relevant experience", required: true, options: ["0-1", "2-3", "4-6", "7-10", "10+"], validation: {}, settings: {} },
      { type: "long_text", label: "Tell us about yourself and why you're a great fit", required: true, options: [], validation: {}, settings: {} },
      { type: "yes_no", label: "Can you start within 30 days?", required: true, options: [], validation: {}, settings: {} },
      { type: "file", label: "Upload your resume (PDF)", required: false, options: [], validation: {}, settings: {} },
    ],
  },
  event: {
    title: "Event Registration",
    description: "Register for the event. We can't wait to see you there!",
    fields: [
      { type: "short_text", label: "Full name", required: true, options: [], validation: {}, settings: {} },
      { type: "email", label: "Email address", required: true, options: [], validation: {}, settings: {} },
      { type: "phone", label: "Phone number", required: false, options: [], validation: {}, settings: {} },
      { type: "select", label: "Which session interests you most?", required: true, options: ["Opening Keynote", "Workshop A", "Workshop B", "Panel Discussion", "Networking"], validation: {}, settings: {} },
      { type: "multi_select", label: "Dietary requirements", required: false, options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Halal", "Kosher", "Other"], validation: {}, settings: {} },
      { type: "yes_no", label: "Do you need parking?", required: false, options: [], validation: {}, settings: {} },
      { type: "long_text", label: "Questions for the organizers?", required: false, options: [], validation: {}, settings: {} },
    ],
  },
  contact: {
    title: "Contact Us",
    description: "Get in touch — we'll respond within 24 hours.",
    fields: [
      { type: "short_text", label: "Your name", required: true, options: [], validation: {}, settings: {} },
      { type: "email", label: "Email address", required: true, options: [], validation: {}, settings: {} },
      { type: "select", label: "What's this about?", required: true, options: ["General inquiry", "Support", "Partnership", "Press", "Billing", "Other"], validation: {}, settings: {} },
      { type: "long_text", label: "Your message", required: true, options: [], validation: {}, settings: {} },
    ],
  },
  survey: {
    title: "Product Research Survey",
    description: "Help us build a better product. Takes about 3 minutes.",
    fields: [
      { type: "select", label: "What best describes your role?", required: true, options: ["Developer", "Designer", "Product Manager", "Founder/CEO", "Marketing", "Student", "Other"], validation: {}, settings: {} },
      { type: "select", label: "Company size", required: true, options: ["Just me", "2-10", "11-50", "51-200", "201-1000", "1000+"], validation: {}, settings: {} },
      { type: "multi_select", label: "Which tools do you currently use?", required: true, options: ["Typeform", "Google Forms", "JotForm", "Tally", "SurveyMonkey", "Microsoft Forms", "None"], validation: {}, settings: {} },
      { type: "scale", label: "How satisfied are you with your current tool? (1-10)", required: true, options: [], validation: {}, settings: {} },
      { type: "rating", label: "How important is data privacy to you?", required: true, options: [], validation: {}, settings: {} },
      { type: "number", label: "Monthly budget for tools like this ($)", required: false, options: [], validation: {}, settings: {} },
      { type: "long_text", label: "What's the #1 feature you wish existed?", required: false, options: [], validation: {}, settings: {} },
    ],
  },
  waitlist: {
    title: "Join the Waitlist",
    description: "Be the first to know when we launch.",
    fields: [
      { type: "short_text", label: "Your name", required: true, options: [], validation: {}, settings: {} },
      { type: "email", label: "Email address", required: true, options: [], validation: {}, settings: {} },
      { type: "select", label: "What interests you most?", required: false, options: ["The product", "The API", "Self-hosting", "Enterprise features", "Just curious"], validation: {}, settings: {} },
    ],
  },
};

const KEYWORD_MAP: Record<string, string> = {
  feedback: "feedback", customer: "feedback", satisfaction: "feedback", review: "feedback", nps: "feedback",
  job: "job", application: "job", hiring: "job", career: "job", resume: "job", apply: "job", recruit: "job",
  event: "event", registration: "event", rsvp: "event", signup: "event", conference: "event", meetup: "event", workshop: "event",
  contact: "contact", inquiry: "contact", message: "contact", "get in touch": "contact", support: "contact",
  survey: "survey", research: "survey", poll: "survey", quiz: "survey", market: "survey", product: "survey",
  waitlist: "waitlist", "wait list": "waitlist", launch: "waitlist", "coming soon": "waitlist", early: "waitlist", beta: "waitlist",
};

function generateFromTemplate(prompt: string): AIGenerateResponse {
  const lower = prompt.toLowerCase();

  // Find best matching template
  let bestMatch = "contact"; // default
  for (const [keyword, template] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) {
      bestMatch = template;
      break;
    }
  }

  return TEMPLATES[bestMatch] || TEMPLATES.contact;
}
