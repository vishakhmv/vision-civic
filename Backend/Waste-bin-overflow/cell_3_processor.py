import urllib.request
import os
import cv2

def process_media(file_path):
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return

    filename = os.path.basename(file_path)
    output_path = os.path.join(PROJECT_DIR, f"detected_{filename}")
    ext = os.path.splitext(file_path)[1].lower()

    if ext in ['.jpg', '.jpeg', '.png']:
        img = cv2.imread(file_path)
        status, conf = check_overflow(img)
        
        color = (0, 0, 255) if status == "YES" else (0, 255, 0)
        text = f"OVERFLOWING: {status} ({conf:.1%})"
        
        cv2.putText(img, text, (30, 60), cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 3)
        cv2.imwrite(output_path, img)
        
        print(f"📷 Image Result: {status} | Confidence: {conf:.1%} | Saved: {output_path}")

    elif ext in ['.mp4', '.avi', '.mov', '.mkv']:
        cap = cv2.VideoCapture(file_path)
        width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps    = int(cap.get(cv2.CAP_PROP_FPS)) or 25
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        frame_idx = 0
        status, conf = "NO", 0.0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_idx += 1
            if frame_idx % 3 == 0 or frame_idx == 1:
                status, conf = check_overflow(frame)

            color = (0, 0, 255) if status == "YES" else (0, 255, 0)
            text = f"OVERFLOWING: {status} ({conf:.1%})"
            cv2.putText(frame, text, (30, 60), cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 3)
            
            out.write(frame)

        cap.release()
        out.release()
        print(f"🎥 Video Result Processed | Saved: {output_path}")
