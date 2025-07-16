import cv2
import pytesseract
import re
from datetime import datetime, time
from typing import Optional, Tuple
import numpy as np
from PIL import Image
import os

class OCRService:
    def __init__(self):
        # Configure Tesseract path if needed
        # pytesseract.pytesseract.tesseract_cmd = r'/usr/bin/tesseract'
        pass

    def preprocess_image(self, image_path: str) -> np.ndarray:
        """Preprocess image for better OCR results"""
        # Read image
        image = cv2.imread(image_path)

        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Apply thresholding to get binary image
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Apply morphological operations to remove noise
        kernel = np.ones((1, 1), np.uint8)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

        # Apply Gaussian blur to smooth the image
        blurred = cv2.GaussianBlur(binary, (1, 1), 0)

        return blurred

    def extract_text(self, image_path: str) -> str:
        """Extract text from image using Tesseract OCR"""
        try:
            # Preprocess image
            processed_image = self.preprocess_image(image_path)

            # Extract text using Tesseract
            text = pytesseract.image_to_string(processed_image, config='--psm 6')

            return text.strip()
        except Exception as e:
            print(f"Error extracting text: {e}")
            return ""

    def extract_time_from_text(self, text: str) -> Tuple[Optional[time], Optional[time]]:
        """Extract time information from OCR text"""
        # Common time patterns
        time_patterns = [
            r'(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?',  # 12:30, 12:30:45, 12:30 PM
            r'(\d{1,2})\.(\d{2})\s*(AM|PM|am|pm)?',  # 12.30, 12.30 PM
            r'(\d{1,2})h(\d{2})',  # 12h30
            r'(\d{1,2})h',  # 12h
        ]

        times = []

        for pattern in time_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    hour = int(match.group(1))
                    minute = int(match.group(2)) if match.group(2) else 0
                    second = int(match.group(3)) if match.group(3) else 0
                    ampm = match.group(4) if len(match.groups()) >= 4 else None

                    # Handle 12-hour format
                    if ampm:
                        if ampm.upper() == 'PM' and hour != 12:
                            hour += 12
                        elif ampm.upper() == 'AM' and hour == 12:
                            hour = 0

                    # Validate time
                    if 0 <= hour <= 23 and 0 <= minute <= 59 and 0 <= second <= 59:
                        times.append(time(hour, minute, second))
                except (ValueError, TypeError):
                    continue

        # Sort times and return start/end times
        times.sort()

        if len(times) >= 2:
            return times[0], times[-1]  # First and last time
        elif len(times) == 1:
            return times[0], None  # Only start time
        else:
            return None, None

    def extract_date_from_text(self, text: str) -> Optional[datetime]:
        """Extract date information from OCR text in dd/mm/yyyy format"""
        # Date patterns for dd/mm/yyyy format
        date_patterns = [
            r'(\d{1,2})/(\d{1,2})/(\d{4})',  # dd/mm/yyyy
            r'(\d{1,2})-(\d{1,2})-(\d{4})',  # dd-mm-yyyy
            r'(\d{1,2})\.(\d{1,2})\.(\d{4})',  # dd.mm.yyyy
            r'(\d{1,2})\\(\d{1,2})\\(\d{4})',  # dd\mm\yyyy
        ]

        print(f"DEBUG: Extracting date from text: {text}")  # Debug line

        for pattern in date_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                try:
                    day = int(match.group(1))
                    month = int(match.group(2))
                    year = int(match.group(3))

                    print(f"DEBUG: Found date pattern: {day}/{month}/{year}")  # Debug line

                    # Validate date
                    if 1 <= day <= 31 and 1 <= month <= 12 and 1900 <= year <= 2100:
                        # Create datetime object (using noon to avoid timezone issues)
                        result = datetime(year, month, day, 12, 0, 0)
                        print(f"DEBUG: Returning date: {result}")  # Debug line
                        return result
                except (ValueError, TypeError) as e:
                    print(f"DEBUG: Error parsing date: {e}")  # Debug line
                    continue

        print("DEBUG: No date found in text")  # Debug line
        return None

    def process_photo(self, image_path: str) -> dict:
        """Process photo and extract time and date information"""
        # Extract text from image
        extracted_text = self.extract_text(image_path)

        # Extract time information
        start_time, end_time = self.extract_time_from_text(extracted_text)

        # Extract date information
        extracted_date = self.extract_date_from_text(extracted_text)

        result = {
            "extracted_text": extracted_text,
            "suggested_start_time": start_time,
            "suggested_end_time": end_time,
            "suggested_date": extracted_date.isoformat() if extracted_date else None
        }

        print(f"DEBUG: OCR Result: {result}")  # Debug line
        return result
