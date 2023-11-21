import pytesseract, argparse, sys
from PIL import Image
from pdf2image import convert_from_path

# Construct the argument parser
parser = argparse.ArgumentParser(description='Process a PDF for OCR.')
parser.add_argument('--path', required=True, help='Path to the PDF file')
parser.add_argument('--lang', required=True, help='Language for OCR')
args = parser.parse_args()

filepath = args.path
lang = args.lang

# Replace 'path_to_pdf' with your PDF file path
pages = convert_from_path(filepath)

total_pages = len(pages)

for i, page in enumerate(pages):
    # Save each page as an image
    page.save(f'{filepath}_page_{i}.jpg', 'JPEG')


total_text = ''
for i in range(total_pages):
    text = pytesseract.image_to_string(Image.open(f'{filepath}_page_{i}.jpg'), lang=lang)
    total_text += text

output_file = f'{filepath}_parsed.txt'
try:
    with open(output_file, 'w') as f:
        f.write(total_text)
except Exception as e:
    print(f'Error writing output file {e}')
    sys.exit(1)

print(f'Output file written successfully')
sys.exit(0)