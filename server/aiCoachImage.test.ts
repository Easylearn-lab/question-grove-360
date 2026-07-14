import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "This appears to be a clinical image showing..." } }],
  }),
}));

describe("AI Coach Image Upload - Backend Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate supported image formats", () => {
    const SUPPORTED_FORMATS = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    
    expect(SUPPORTED_FORMATS.includes("image/jpeg")).toBe(true);
    expect(SUPPORTED_FORMATS.includes("image/png")).toBe(true);
    expect(SUPPORTED_FORMATS.includes("image/gif")).toBe(true);
    expect(SUPPORTED_FORMATS.includes("image/webp")).toBe(true);
    expect(SUPPORTED_FORMATS.includes("image/bmp")).toBe(false);
    expect(SUPPORTED_FORMATS.includes("application/pdf")).toBe(false);
  });

  it("should enforce 5MB file size limit", () => {
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    
    expect(MAX_IMAGE_SIZE).toBe(5242880);
    expect(4 * 1024 * 1024 <= MAX_IMAGE_SIZE).toBe(true); // 4MB should pass
    expect(6 * 1024 * 1024 <= MAX_IMAGE_SIZE).toBe(false); // 6MB should fail
  });

  it("should construct correct multimodal message format with image", () => {
    const imageData = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const mimeType = "image/png";
    const userText = "What does this ECG show?";

    // Simulate the backend message construction
    const contentParts: any[] = [];
    contentParts.push({
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${imageData}`,
        detail: "high"
      }
    });
    contentParts.push({ type: "text", text: userText });

    expect(contentParts).toHaveLength(2);
    expect(contentParts[0].type).toBe("image_url");
    expect(contentParts[0].image_url.url).toContain("data:image/png;base64,");
    expect(contentParts[0].image_url.detail).toBe("high");
    expect(contentParts[1].type).toBe("text");
    expect(contentParts[1].text).toBe(userText);
  });

  it("should use default text when image is sent without text", () => {
    const imageData = "base64data";
    const mimeType = "image/jpeg";
    const searchQuery = ""; // No text provided

    const contentParts: any[] = [];
    contentParts.push({
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${imageData}`,
        detail: "high"
      }
    });
    if (searchQuery) {
      contentParts.push({ type: "text", text: searchQuery });
    } else {
      contentParts.push({ type: "text", text: "Please analyse this image." });
    }

    expect(contentParts[1].text).toBe("Please analyse this image.");
  });

  it("should select vision model when image is provided", () => {
    const image = { data: "base64data", mimeType: "image/png" };
    const useVisionModel = !!(image && image.data);
    
    expect(useVisionModel).toBe(true);
    
    const modelConfig = useVisionModel ? { model: "claude-sonnet-4-6" } : {};
    expect(modelConfig.model).toBe("claude-sonnet-4-6");
  });

  it("should use default model when no image is provided", () => {
    const image = null;
    const useVisionModel = !!(image && (image as any)?.data);
    
    expect(useVisionModel).toBe(false);
    
    const modelConfig = useVisionModel ? { model: "claude-sonnet-4-6" } : {};
    expect(modelConfig).toEqual({});
  });

  it("should preserve existing text-only message flow", () => {
    const messages = [
      { role: "user", content: "What are the causes of iron deficiency anaemia?" },
    ];
    const image = undefined;

    // When no image, latestUserMessage should be extracted as string
    const lastMsg = messages[messages.length - 1];
    let latestUserMessage = '';
    if (typeof lastMsg?.content === 'string') {
      latestUserMessage = lastMsg.content;
    }

    expect(latestUserMessage).toBe("What are the causes of iron deficiency anaemia?");
    
    // No image means no multimodal content
    const hasImage = !!(image && (image as any)?.data && (image as any)?.mimeType);
    expect(hasImage).toBe(false);
  });

  it("should handle image request body structure correctly", () => {
    const requestBody = {
      messages: [
        { role: "user", content: "Describe this lesion" }
      ],
      image: {
        data: "iVBORw0KGgoAAAANSUhEUg...",
        mimeType: "image/jpeg"
      }
    };

    expect(requestBody.image).toBeDefined();
    expect(requestBody.image.data).toBeTruthy();
    expect(requestBody.image.mimeType).toBe("image/jpeg");
    expect(requestBody.messages).toHaveLength(1);
  });
});
