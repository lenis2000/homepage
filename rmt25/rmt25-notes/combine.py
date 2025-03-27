#!/usr/bin/env python3
import os
import re
import subprocess

# Configuration
num_lectures = 15
output_file = "rmt2025-book.tex"
lecture_files = [f"rmt2025-l{i:02d}.tex" for i in range(1, num_lectures + 1)]

def extract_preamble(filename):
    """Extract the preamble (everything before \begin{document})"""
    with open(filename, 'r') as f:
        content = f.read()

    match = re.search(r'(.*?)\\begin{document}', content, re.DOTALL)
    if match:
        return match.group(1)
    return ""

def extract_lecture_content(filename):
    """Extract the main content from a lecture file"""
    with open(filename, 'r') as f:
        content = f.read()

    # Find content between \begin{document} and \end{document}
    match = re.search(r'\\begin{document}(.*?)\\end{document}', content, re.DOTALL)
    if not match:
        return ""

    content = match.group(1)

    # Remove title, date, author and maketitle
    content = re.sub(r'\\title\{.*?\}.*?\\maketitle', '', content, flags=re.DOTALL)

    # Remove TOC if present
    content = re.sub(r'\\tableofcontents', '', content)

    return content

def update_lecture_references(content, lecture_num):
    """Convert href references to other lectures into proper LaTeX \Cref references"""

    # Pattern for href references to lecture PDFs
    pattern = r'\\href\{https://lpetrov\.cc/rmt25/rmt25-notes/rmt2025-l(\d+)\.pdf\}\{([^{}]*)\}'

    def replacement(match):
        target_lecture_num = int(match.group(1))
        link_text = match.group(2)

        # If it's a reference to the TeX Source, keep that reference
        if "TeX Source" in link_text:
            return match.group(0)

        # Use \Cref instead of \hyperref for better consistency with the rest of the document
        return f'\\Cref{{chap:lecture{target_lecture_num}}}'

    # Replace PDF references
    updated_content = re.sub(pattern, replacement, content)

    return updated_content

def extract_lecture_title(filename):
    """Extract the title of a lecture from the file"""
    with open(filename, 'r') as f:
        content = f.read()

    # Look for title in the format "Lectures on Random Matrices\n(Spring 2025)\n\\Lecture X: Title"
    title_match = re.search(r'\\title\{.*?\\\\Lecture \d+: (.*?)\}', content, flags=re.DOTALL)
    if title_match:
        return title_match.group(1).strip()

    # Alternative pattern if the first one fails
    alt_title_match = re.search(r'\\title\{.*?Lecture \d+: (.*?)\}', content, flags=re.DOTALL)
    if alt_title_match:
        return alt_title_match.group(1).strip()

    return "Lecture Content"  # Default if no title found

def create_book():
    """Create a unified book from lecture files"""
    # Get the list of existing lecture files
    existing_files = [f for f in lecture_files if os.path.exists(f)]
    if not existing_files:
        print("Error: No lecture files found")
        return False

    # Get preamble from first lecture
    preamble = extract_preamble(existing_files[0])

    # Change document class from article to book
    preamble = re.sub(
        r'\\documentclass\[letterpaper,11pt,oneside,reqno\]\{article\}',
        r'\\documentclass[letterpaper,11pt,twoside,reqno]{book}',
        preamble
    )

    # Create book content
    with open(output_file, 'w') as book:
        # Write the preamble
        book.write(preamble)

        # Begin document
        book.write("\n\\begin{document}\n\n")

        # Add book title and TOC
        book.write("\\title{Lectures on Random Matrices (Spring 2025)}\n")
        book.write("\\author{Leonid Petrov}\n")
        book.write("\\date{Spring 2025}\n")
        book.write("\\maketitle\n")
        book.write("\\tableofcontents\n\n")

        # Process each lecture
        for i, lecture_file in enumerate(existing_files, 1):
            print(f"Processing {lecture_file}")

            # Extract lecture title
            lecture_num = int(re.search(r'l(\d+)', lecture_file).group(1))
            title = extract_lecture_title(lecture_file)

            # Set chapter title
            chapter_title = f"Lecture {lecture_num}: {title}"

            # Add chapter heading and label
            book.write(f"\\chapter{{{chapter_title}}}\n")
            book.write(f"\\label{{chap:lecture{lecture_num}}}\n")

            # Add lecture content with updated references
            content = extract_lecture_content(lecture_file)
            content = update_lecture_references(content, lecture_num)
            book.write(content)
            book.write("\n\n")

        # End document
        book.write("\\end{document}\n")

    print(f"Book LaTeX file created: {output_file}")
    return True

def compile_book():
    """Compile the book using pdflatex"""
    print("Compiling book...")
    try:
        # Run pdflatex twice to ensure references are correct
        subprocess.run(["pdflatex", output_file], check=True)
        subprocess.run(["pdflatex", output_file], check=True)
        print(f"Book compiled successfully: {output_file.replace('.tex', '.pdf')}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error compiling book: {e}")
        return False

if __name__ == "__main__":
    if create_book():
        compile_book()
