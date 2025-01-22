#!/bin/zsh

# Check if pdftk is installed
if ! command -v pdftk &> /dev/null; then
    echo "Error: pdftk is not installed. Please install it first."
    echo "You can install it using:"
    echo "  brew install pdftk-java    # on macOS"
    echo "  sudo apt install pdftk    # on Ubuntu/Debian"
    exit 1
fi

# Create a temporary file to store the PDF file list
temp_file=$(mktemp)

# Generate the list of PDF files in the correct order
for i in {01..15}; do
    echo "rmt2025-l${i}.pdf" >> "$temp_file"
done

# Concatenate PDFs using pdftk
pdftk $(cat "$temp_file") cat output rmt2025-lectures-combined.pdf

# Clean up the temporary file
rm "$temp_file"

echo "PDFs have been combined into rmt2025-lectures-combined.pdf"
