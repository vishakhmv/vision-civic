import os
from google.colab import drive

# 1. Mount Google Drive
drive.mount('/content/drive')

# 2. Set directory
PROJECT_DIR = '/content/drive/MyDrive/Waste-bin-overflow'
os.makedirs(PROJECT_DIR, exist_ok=True)
os.chdir(PROJECT_DIR)

# 3. Install required libraries
import subprocess
subprocess.run(["pip", "install", "-q", "transformers", "torch", "torchvision", "opencv-python", "Pillow"])

print(f"✅ Setup complete! Working directory: {PROJECT_DIR}")
