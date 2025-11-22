import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { env } from "./env";

const client = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

const imageClient = (env.OPENAI_IMAGE_API_KEY || env.OPENAI_API_KEY)
  ? new OpenAI({ apiKey: env.OPENAI_IMAGE_API_KEY || env.OPENAI_API_KEY })
  : null;

// Zod schema for structured output
const IngredientSchema = z.object({
  name: z.string().describe("Name of the ingredient (e.g., 'Mozzarella cheese', 'Tomato sauce', 'Olive oil'). Can use 'Others' for minor ingredients combined."),
  portion_text: z
    .string()
    .describe(
      'Portion description in everyday units (e.g., "1 cup", "2 slices", "1 tablespoon")'
    ),
  estimated_weight_g: z.number().describe("Estimated weight in grams"),
  calories: z.number().describe("Estimated calories for this specific portion of the ingredient"),
  macros: z.object({
    p: z.number().describe("Protein in grams"),
    c: z.number().describe("Carbohydrates in grams"),
    f: z.number().describe("Fat in grams"),
  }).describe("Macronutrients for this ingredient"),
  notes: z
    .string()
    .optional()
    .describe("Any uncertainty or additional observations"),
});

const VisionResponseSchema = z.object({
  dishTitle: z
    .string()
    .describe(
      'Overall name of the dish (e.g., "Margherita Pizza", "Grilled Chicken with Rice"). Be specific and appetizing.'
    ),
  ingredientsList: z
    .array(IngredientSchema)
    .describe(
      'List of INGREDIENTS only. Do NOT include the dish name itself. Calculate calories and macros for each ingredient. Can add an "Others" ingredient for minor components like spices, oils, etc.'
    ),
  confidence: z.number().min(0).max(1).describe("Confidence score from 0 to 1"),
});

export type Ingredient = z.infer<typeof IngredientSchema>;
export type VisionResponse = z.infer<typeof VisionResponseSchema>;
export type GeneratedImage = { base64: string };

/**
 * System prompt for food detection
 * Optimized for accuracy, conservative estimates, and multilingual inputs
 */
const SYSTEM_PROMPT = `You are an expert nutritionist AI for a food tracking app. Assume every input contains food and produce the best possible dish name and ingredients with nutrition. Only return empty results if the content is clearly NOT food (e.g., random gibberish or an object that obviously is not edible).

CRITICAL RULES - FOLLOW EXACTLY:

0. DEFAULT TO FOOD:
   - Expect that food is present; give your best guess even with low confidence.
   - Return EMPTY ingredientsList only when it is unmistakably non-food.
   - If unsure, provide a tentative dishTitle and a minimal, reasonable ingredient list instead of giving up.
   - Confidence should reflect how sure you are (0-1) but do NOT withhold results solely because confidence is low.

1. LANGUAGE HANDLING:
   - The input (image context or text) may be in ANY language.
   - Translate/normalize all outputs to ENGLISH: dishTitle, ingredient names, notes, portion_text.

2. DISH TITLE - REQUIRED:
   - Always fill dishTitle with the overall dish name (e.g., "Pepperoni Pizza", "Grilled Chicken with Rice").
   - Be specific and appetizing. Use "Unknown" only for truly unrecognized/non-food cases.

3. INGREDIENTS LIST - INGREDIENTS ONLY:
   - Do NOT include the dish name itself as an ingredient.
   - Example of correct: dishTitle="Pepperoni Pizza", ingredientsList includes "Pizza dough", "Pepperoni slices", "Mozzarella cheese", "Tomato sauce".

4. CALCULATE NUTRITION:
   - Provide calories and macros (protein, carbs, fat) for each ingredient portion.
   - Use conservative, evidence-based estimates from nutrition knowledge.

5. "OTHERS" INGREDIENT:
   - Group small amounts of oils/spices/seasonings into one "Others" entry.
   - Example: {"name": "Others", "portion_text": "olive oil, basil, oregano", "calories": 50, "macros": {"p": 0, "c": 1, "f": 5}}

6. PORTION GUIDELINES:
   - Rice/grains: 1 cup ≈ 150-200g
   - Protein: palm-sized ≈ 100-150g
   - Vegetables: 1 cup ≈ 70-100g
   - Cheese: 1 oz ≈ 28g
   - Oils: 1 tbsp ≈ 14g

OUTPUT:
Return valid JSON with dishTitle and ingredientsList (with calories and macros) and a confidence score. Always output in ENGLISH.`;

/**
 * Detect food items from a base64-encoded image
 * Uses GPT-4o-mini (or env.AI_MODEL) with structured JSON output
 */
export async function detectFoodFromImage(
  base64: string
): Promise<VisionResponse> {
  if (!client) {
    console.warn("OpenAI client not initialized - API key missing");
    return { dishTitle: "Unknown Dish", ingredientsList: [], confidence: 0.2 };
  }

  try {
    const completion = await retryWithBackoff(async () => {
      return await client.chat.completions.create({
        // IMPORTANT: Default vision model for PlateLens.
        // DO NOT CHANGE THIS DEFAULT AUTOMATICALLY.
        // If you need a different model, set AI_MODEL in env instead.
        model: env.AI_MODEL || "gpt-5",
        // Some newer models (e.g., gpt-4.1 / gpt-5 family) do not
        // accept `max_tokens` and require `max_completion_tokens`.
        // Use the newer parameter name to avoid invalid_request_error.
        max_completion_tokens: 1500,
        reasoning_effort: "low",
        response_format: zodResponseFormat(
          VisionResponseSchema,
          "food_detection"
        ),
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this food image. Assume there is food present and give your best guess even if confidence is low. Only return EMPTY ingredientsList when the image is clearly NOT food. You MUST provide: 1) dishTitle (the name of the complete dish, in English), and 2) ingredientsList (individual ingredients only, in English, with nutrition). Always output English, even if the image context implies another language.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`,
                  detail: "auto",
                },
              },
            ],
          },
        ],
      });
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error("No content in OpenAI response");
      return { dishTitle: "Unknown Dish", ingredientsList: [], confidence: 0 };
    }

    console.log('========================================');
    console.log('RAW AI RESPONSE:');
    console.log(content);
    console.log('========================================');

    const parsed = JSON.parse(content) as VisionResponse;

    console.log('========================================');
    console.log('PARSED AI VISION RESPONSE:');
    console.log('Dish Title:', parsed.dishTitle);
    console.log('Number of ingredients:', parsed.ingredientsList?.length || 0);
    console.log('Ingredients:', JSON.stringify(parsed.ingredientsList, null, 2));
    console.log('Confidence:', parsed.confidence);
    console.log('========================================');

    // Validate the response
    if (!parsed.ingredientsList || !Array.isArray(parsed.ingredientsList)) {
      console.error("Invalid response structure from OpenAI");
      return {
        dishTitle: parsed.dishTitle || "Unknown Dish",
        ingredientsList: [],
        confidence: 0,
      };
    }

    // Ensure dishTitle is present
    if (!parsed.dishTitle || parsed.dishTitle.trim() === '') {
      console.error('CRITICAL ERROR: AI did not provide dishTitle!');
      console.error('This violates the schema. Raw response:', content);

      // Try to infer dishTitle from ingredients if only one item
      if (parsed.ingredientsList.length === 1) {
        parsed.dishTitle = parsed.ingredientsList[0].name;
        console.warn(`Inferred dishTitle from single ingredient: ${parsed.dishTitle}`);
      } else {
        parsed.dishTitle = 'Mixed Plate';
        console.warn('Using fallback dishTitle: Mixed Plate');
      }
    }

    // Validate that ingredients don't contain dish-like names
    // (e.g., "Pizza" in ingredients when dishTitle is "Pepperoni Pizza")
    const dishWords = parsed.dishTitle.toLowerCase().split(' ');
    const problematicIngredients = parsed.ingredientsList.filter(ing => {
      const ingNameLower = ing.name.toLowerCase();
      // Check if ingredient name is too similar to dish title (likely a mistake)
      return dishWords.some(word => word.length > 4 && ingNameLower === word);
    });

    if (problematicIngredients.length > 0) {
      console.warn('WARNING: Found ingredients that look like dish names:',
        problematicIngredients.map(i => i.name));
      console.warn('This might indicate AI confusion between dishTitle and ingredients');
    }

    return parsed;
  } catch (error) {
    console.error("OpenAI vision detection error:", error);

    // Return empty result on error instead of throwing
    return {
      dishTitle: "Unknown Dish",
      ingredientsList: [],
      confidence: 0,
    };
  }
}

/**
 * Generate a square ingredient thumbnail using gpt-image-1.
 * Returns a base64 PNG string.
 */
export async function generateIngredientImage(
  displayName: string
): Promise<string> {
  if (!imageClient) {
    throw new Error("OpenAI client not initialized - API key missing");
  }

  const prompt = `High-quality ingredient thumbnail of ${displayName}, isolated on a clean white background, centered, no text, no watermark.`;

  const response = await retryWithBackoff(async () => {
    return await imageClient.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      quality: "medium", // balanced latency/quality for thumbnails
    });
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI image generation returned empty response");
  }

  return b64;
}

/**
 * Detect food items from a text description
 * Uses same VisionResponseSchema as image detection for consistency
 */
export async function detectFoodFromText(
  description: string
): Promise<VisionResponse> {
  if (!client) {
    console.warn("OpenAI client not initialized - API key missing");
    return { dishTitle: "Unknown Dish", ingredientsList: [], confidence: 0.2 };
  }

  try {
    const completion = await retryWithBackoff(async () => {
      return await client.chat.completions.create({
        model: env.AI_MODEL || "gpt-5",
        max_completion_tokens: 1500,
        reasoning_effort: "low",
        response_format: zodResponseFormat(
          VisionResponseSchema,
          "food_detection"
        ),
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `Analyze this food description and provide nutritional information: "${description}"

IMPORTANT:
- Assume the user is describing food. Give your best guess even with low confidence.
- Only return EMPTY ingredientsList if it is unmistakably non-food (pure gibberish or clearly not edible).
- Always output in ENGLISH, even if the input is in another language.

You MUST provide:
1) A dishTitle (the name of the complete dish or meal, in English)
2) ingredientsList (the individual ingredients with their nutrition, in English; use EMPTY ARRAY only if obviously non-food)

Examples of VALID food:
- Input: "2 scrambled eggs with toast"
  Output: dishTitle="Scrambled Eggs with Toast", ingredientsList=["Eggs (2 large)", "Butter", "Bread (2 slices)"], confidence=0.9

- Input: "chicken caesar salad"
  Output: dishTitle="Chicken Caesar Salad", ingredientsList=["Grilled chicken breast", "Romaine lettuce", "Caesar dressing", "Parmesan cheese", "Croutons"], confidence=0.85

Examples of UNRECOGNIZED input:
- Input: "asdfgh" or "test" or "hello"
  Output: dishTitle="Unknown", ingredientsList=[], confidence=0

Parse all items mentioned and provide accurate nutritional estimates. Return EMPTY ingredientsList for non-food.`,
          },
        ],
      });
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error("No content in OpenAI response");
      return { dishTitle: "Unknown Dish", ingredientsList: [], confidence: 0 };
    }

    console.log('========================================');
    console.log('TEXT SCAN - RAW AI RESPONSE:');
    console.log(content);
    console.log('========================================');

    const parsed = JSON.parse(content) as VisionResponse;

    console.log('========================================');
    console.log('TEXT SCAN - PARSED AI RESPONSE:');
    console.log('Dish Title:', parsed.dishTitle);
    console.log('Number of ingredients:', parsed.ingredientsList?.length || 0);
    console.log('Ingredients:', JSON.stringify(parsed.ingredientsList, null, 2));
    console.log('Confidence:', parsed.confidence);
    console.log('========================================');

    // Validate the response (same validation as image detection)
    if (!parsed.ingredientsList || !Array.isArray(parsed.ingredientsList)) {
      console.error("Invalid response structure from OpenAI");
      return {
        dishTitle: parsed.dishTitle || "Unknown Dish",
        ingredientsList: [],
        confidence: 0,
      };
    }

    // Ensure dishTitle is present
    if (!parsed.dishTitle || parsed.dishTitle.trim() === '') {
      console.error('CRITICAL ERROR: AI did not provide dishTitle!');
      if (parsed.ingredientsList.length === 1) {
        parsed.dishTitle = parsed.ingredientsList[0].name;
        console.warn(`Inferred dishTitle from single ingredient: ${parsed.dishTitle}`);
      } else {
        parsed.dishTitle = 'Mixed Plate';
        console.warn('Using fallback dishTitle: Mixed Plate');
      }
    }

    return parsed;
  } catch (error) {
    console.error("OpenAI text detection error:", error);
    return {
      dishTitle: "Unknown Dish",
      ingredientsList: [],
      confidence: 0,
    };
  }
}

/**
 * Retry helper with exponential backoff
 * Handles rate limits and transient errors
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on authentication errors or invalid requests
      if (error.status === 401 || error.status === 400) {
        throw error;
      }

      // Calculate backoff delay
      const delay = initialDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.1 * delay; // Add 10% jitter

      if (attempt < maxRetries - 1) {
        console.log(`Retry attempt ${attempt + 1} after ${delay + jitter}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      }
    }
  }

  throw lastError;
}
