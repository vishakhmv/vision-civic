import torch
import cv2
from PIL import Image
from transformers import CLIPProcessor, CLIPModel

device = "cuda" if torch.cuda.is_available() else "cpu"
model_id = "openai/clip-vit-base-patch32"

print(f"Loading pretrained model on {device}...")
model = CLIPModel.from_pretrained(model_id).to(device)
processor = CLIPProcessor.from_pretrained(model_id)

LABELS = [
    "an overflowing waste bin with garbage spilling out",
    "a normal clean or empty waste bin"
]

def check_overflow(image_input):
    if isinstance(image_input, str):
        image = Image.open(image_input).convert("RGB")
    elif isinstance(image_input, Image.Image):
        image = image_input
    else:
        image = Image.fromarray(cv2.cvtColor(image_input, cv2.COLOR_BGR2RGB))

    inputs = processor(text=LABELS, images=image, return_tensors="pt", padding=True).to(device)
    
    with torch.no_grad():
        outputs = model(**inputs)
        probs = outputs.logits_per_image.softmax(dim=1)

    overflow_prob = probs[0][0].item()
    
    if overflow_prob > 0.50:
        status = "YES"
        confidence = overflow_prob
    else:
        status = "NO"
        confidence = 1.0 - overflow_prob
    
    return status, confidence

print("✅ Pretrained Overflow Classifier Ready!")
