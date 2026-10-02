import pytest
import numpy as np
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.detectors.waste_bin_detector import WasteBinDetector
from app.detectors.fire_smoke_detector import FireSmokeDetector
from app.monitoring.rolling_buffer import RollingBuffer


def test_password_hashing():
    pwd = "SecureTestPassword#123"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_creation_and_decoding():
    data = {"sub": "user_12345", "role": "USER"}
    token = create_access_token(data)
    assert token is not None

    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "user_12345"
    assert payload["role"] == "USER"
    assert "exp" in payload


def test_rolling_buffer():
    rb = RollingBuffer(max_seconds=2.0, approx_fps=10)
    fake_frame = np.zeros((100, 100, 3), dtype=np.uint8)

    for _ in range(30):
        rb.append(fake_frame)

    frames = rb.get_all()
    assert len(frames) <= 20  # Ring buffer max_frames enforcement


def test_fire_smoke_detector_synthetic_frame():
    detector = FireSmokeDetector()
    # Test on a blank black frame (should be CLEAR)
    blank_frame = np.zeros((200, 200, 3), dtype=np.uint8)
    res = detector.detect(blank_frame)
    assert res["detected"] is False

    # Test on synthetic bright fire color blob (HSV flame area: BGR [0, 160, 255])
    fire_frame = np.zeros((300, 300, 3), dtype=np.uint8)
    fire_frame[100:200, 100:200] = [0, 160, 255]  # Bright orange flame blob
    res_fire = detector.detect(fire_frame)
    assert "detected" in res_fire
    assert "confidence" in res_fire
