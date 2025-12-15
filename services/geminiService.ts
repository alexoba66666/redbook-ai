import { GoogleGenAI, Type } from "@google/genai";
import { NoteContent, RewrittenVersion, AuditResult } from "../types";

// Helper to get client
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is missing");
  }
  return new GoogleGenAI({ apiKey });
};

// 1. Parser Tool: Extract info from Text or Image
export const parseContent = async (text?: string, imageBase64?: string): Promise<NoteContent> => {
  const ai = getAiClient();
  const model = imageBase64 ? 'gemini-2.5-flash-image' : 'gemini-2.5-flash';
  
  const prompt = `
    Analyze the provided content (text or image) which is a social media note (Xiaohongshu style).
    Extract the Title, Main Content, and Tags.
    Return strictly JSON.
  `;

  const parts: any[] = [{ text: prompt }];
  
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: 'image/png', // Assuming PNG for simplicity in this demo context
        data: imageBase64
      }
    });
  } else if (text) {
    parts.push({ text: `Content to parse: ${text}` });
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });

  if (!response.text) throw new Error("No response from AI");
  return JSON.parse(response.text) as NoteContent;
};

// 2. Rewriter Tool: Generate Variations
export const generateVariations = async (original: NoteContent, count: number = 3): Promise<RewrittenVersion[]> => {
  const ai = getAiClient();
  
  const prompt = `
    You are a top-tier Xiaohongshu (RedNote) operations expert.
    Rewrite the following note into ${count} distinct versions.
    
    Strategies to use:
    1. Emotional hook (empathetic)
    2. Data-driven/Educational (dry goods)
    3. Clickbait/Curiosity gap
    
    Ensure you use relevant emojis, proper spacing, and trending keywords.
    Original Title: ${original.title}
    Original Content: ${original.content}
    
    Return a JSON array of objects.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            style: { type: Type.STRING },
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    }
  });

   if (!response.text) throw new Error("No response from AI");
   return JSON.parse(response.text) as RewrittenVersion[];
};

// 3. Audit Tool: Check Sensitive Words
export const auditContent = async (text: string): Promise<AuditResult> => {
  const ai = getAiClient();
  
  const prompt = `
    Audit the following text for violations of the Chinese New Advertising Law and Xiaohongshu platform rules.
    Identify:
    - Absolute terms (e.g., "Best", "First", "No.1", "最", "第一", "国家级")
    - Medical/Therapeutic claims (if not a medical license context, e.g., "cure", "treatment", "治疗", "疗效")
    - False promises.
    
    Return JSON. 'highlightedText' should be the original text with HTML <span> tags wrapping sensitive words with class 'text-red-500 font-bold'.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: `${prompt}\n\nText to audit: ${text}` }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hasSensitiveWords: { type: Type.BOOLEAN },
          score: { type: Type.INTEGER, description: "Safety score 0-100 (100 is safe)" },
          highlightedText: { type: Type.STRING },
          issues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                reason: { type: Type.STRING },
                suggestion: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  if (!response.text) throw new Error("No response from AI");
  return JSON.parse(response.text) as AuditResult;
};

// 4. Workflow: Viral Content Search (Simulated via AI Knowledge)
export const findViralTopics = async (keyword: string): Promise<NoteContent[]> => {
  const ai = getAiClient();
  
  const prompt = `
    Based on the keyword "${keyword}", generate 3 hypothetical "Viral" Xiaohongshu notes that would likely perform well right now.
    Use current trends, seasonal topics, and popular formats.
    Return JSON.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    }
  });

  if (!response.text) throw new Error("No response from AI");
  return JSON.parse(response.text) as NoteContent[];
};

// 5. Batch Generator: 5 High Quality Notes with Research
export const generateBatchNotes = async (topic: string, excludeAngles: string[] = []): Promise<NoteContent[]> => {
  const ai = getAiClient();
  
  // Using gemini-2.5-flash for reliability and speed.
  const model = 'gemini-2.5-flash';

  const prompt = `
    Act as a professional Xiaohongshu (RedNote) Content Director with 10 years of experience.
    Topic: ${topic}
    
    Task:
    1. Analyze the top performing angles for this topic.
    2. Generate 5 COMPLETE and DISTINCT high-quality notes.
    3. **Crucial Constraint**: Do NOT use these angles/titles: ${JSON.stringify(excludeAngles)}. Create fresh, new perspectives.
    4. **Private Traffic Hook (夹带私货)**: You MUST include a "hidden gem" or "free resource" bait at the end of the content. 
       - Ask users to "Private Message (私信)" or "Comment 666" to get a specific resource (PDF/Guide/Checklist) related to the topic.
       - Frame it as: "I've organized my 5 years of experience into this [Resource Name], DM me to get it for free!"
       - This establishes authority and drives leads.
    
    Requirements:
    - Tone: Authentic, helpful, experienced, and engaging (RedNote style).
    - Structure: Catchy title, emoji-rich content, relevant hashtags.
    - Image Prompt: Be visual and specific (e.g., "A bright, high-key photography shot of...").
    
    Return a JSON array of 5 objects.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            imagePrompt: { type: Type.STRING }
          }
        }
      }
    }
  });

  if (!response.text) throw new Error("No response from AI");
  return JSON.parse(response.text) as NoteContent[];
};

// 6. Image Generation (NanoBanana)
export const generateCoverImage = async (prompt: string): Promise<string> => {
  const ai = getAiClient();
  
  // Using gemini-2.5-flash-image (NanoBanana) for image generation
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: prompt + ", high quality, aesthetic, 3:4 aspect ratio, xiaohongshu style" }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4"
      }
    }
  });

  // Extract base64 image from response
  let base64Image = "";
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) {
        base64Image = part.inlineData.data;
        break;
      }
    }
  }

  if (!base64Image) throw new Error("Failed to generate image");
  return base64Image;
};

// 7. Product Photography Studio (Edit/Generate based on input)
export const generateProductShot = async (base64Input: string, anglePrompt: string): Promise<string> => {
  const ai = getAiClient();

  const prompt = `
    You are a professional product photographer.
    Take the product in the input image and generate a high-end studio photography shot.
    
    Requirement:
    - Keep the product's key features recognizable.
    - Context: ${anglePrompt} (e.g., clean white background, lifestyle scene, specific angle).
    - Lighting: Professional softbox lighting.
    - Quality: High resolution, sharp focus.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: prompt },
        { 
          inlineData: {
            mimeType: 'image/png', // Accepting PNG/JPEG input
            data: base64Input
          }
        }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4"
      }
    }
  });

  let base64Image = "";
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) {
        base64Image = part.inlineData.data;
        break;
      }
    }
  }

  if (!base64Image) throw new Error("Failed to generate product shot");
  return base64Image;
};

// 8. Image Upscaler (Updated for strict fidelity)
export const upscaleImage = async (base64Input: string, aspectRatio: string = '3:4', textContext?: string): Promise<string> => {
  const ai = getAiClient();

  // Optimized prompt for "reconstruction" rather than "creative enhancement"
  // This drastically reduces the model's tendency to change colors or hallucinate fonts.
  let prompt = `
    Task: Produce a high-resolution Replica of the input image.
    
    STRICT Constraints (Do NOT Violate):
    1. **Text Fidelity**: The image contains specific text. You MUST render the characters EXACTLY as they appear or as specified. Do NOT change the font style abruptly. Do NOT turn text into random scribbles.
    2. **Color Freeze**: Maintain the EXACT color palette, saturation, and lighting of the original image. Do not apply "filters" or change the mood. The output must look like the original, just sharper.
    3. **No Hallucinations**: Do not add new objects, patterns, or background elements.
    4. **Sharpening**: Fix blur and compression artifacts only.
  `;

  if (textContext && textContext.trim().length > 0) {
    prompt += `\n\n**MANDATORY TEXT OVERRIDE**: The text in the image is: "${textContext}".\nRender THESE SPECIFIC CHARACTERS correctly in the corresponding positions. Verify the strokes of the Chinese characters.`;
  } else {
    prompt += `\n\nIf the image contains text, treat it as a logo/symbol and preserve its exact shape.`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/png',
            data: base64Input
          }
        }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio 
      }
    }
  });

  let base64Image = "";
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) {
        base64Image = part.inlineData.data;
        break;
      }
    }
  }

  if (!base64Image) throw new Error("Failed to upscale image");
  return base64Image;
};
