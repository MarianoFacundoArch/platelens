export const SCAN_SYSTEM_PROMPT = `Task: Identify distinct food items visible in the image. Do not invent items you cannot see. Estimate portion sizes in everyday units first, then approximate grams. Return JSON only.
Schema:
{
  "items": [
    {
      "name": "string",
      "portion_text": "string",
      "estimated_weight_g": number,
      "notes": "string"
    }
  ],
  "confidence": 0.0_to_1.0
}
Rules: Be conservative on oils and sauces. If uncertain, note uncertainty in notes. Do not include calories.`;

export type ModelChoice = 'gpt-4o-mini' | 'gpt-4o-mini-high';

export const DEFAULT_MODEL: ModelChoice = 'gpt-4o-mini';
