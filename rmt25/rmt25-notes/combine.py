#!/usr/bin/env python3
import os
import re
import subprocess

# Configuration
num_lectures = 15
output_file = "rmt2025-lectures-combined.tex"
lecture_files = [f"rmt2025-l{i:02d}.tex" for i in range(1, num_lectures + 1)]

def extract_lecture_content(filename):
    """Extract the main content from a lecture file, excluding bibliography and author info"""
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

    # Remove abstract environment
    content = re.sub(r'\\begin\{abstract\}(.*?)\\end\{abstract\}', '', content, flags=re.DOTALL)

    # Find and remove bibliography and author information
    # This takes a more careful approach to remove any bibliographystyle/bibliography commands
    content = re.sub(r'\\bibliographystyle\{[^}]*\}', '', content)
    content = re.sub(r'\\bibliography\{[^}]*\}', '', content)
    content = re.sub(r'\\medskip\s+\\textsc\{L\.\s+Petrov[^}]*\}', '', content, flags=re.DOTALL)
    content = re.sub(r'E-mail:\s*\\texttt\{[^}]*\}', '', content)

    # Remove appendix commands
    content = re.sub(r'\\appendix', '', content)

    # Fix label issues
    content = re.sub(r'\\label\{([^{}]*)\{([^{}]*)\}', r'\\label{\1\2}', content)
    content = re.sub(r'\\label\{([^{}]*\{[^{}]*)\}', r'\\label{fixed-\1}', content)
    content = re.sub(r'\\label\{\{A\.(\d+)', r'\\label{appA\1', content)

    # Fix any remaining problematic labels with double braces
    while '\\label{{' in content:
        content = content.replace('\\label{{', '\\label{fixed-')

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

        # Use \Cref instead of \hyperref for better consistency
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

def sanitize_problem_sections(content):
    """Fix common LaTeX errors in problem sections and remove due dates"""
    # Fix section counters related to problems
    content = re.sub(r'\\setcounter\{section\}\{\d+\}', '', content)

    # Remove due dates from problem sections
    content = re.sub(r'\\section\{Problems \(due [^)]*\)\}', r'\\section{Problems}', content)

    # Clean up any remaining problematic labels
    content = re.sub(r'\\label\{(\{+)(.*?)(\}*)\}', r'\\label{\2}', content)

    return content

def create_book():
    """Create a unified book from lecture files"""
    # Get the list of existing lecture files
    existing_files = [f for f in lecture_files if os.path.exists(f)]
    if not existing_files:
        print("Error: No lecture files found")
        return False

    # Create book content with a manually defined preamble
    with open(output_file, 'w') as book:
        # Write a unified preamble
        book.write("""\\documentclass[letterpaper,11pt,oneside,reqno]{book}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Packages from the original lectures

% Core packages
\\usepackage[pdftex,backref=page,colorlinks=true,linkcolor=blue,citecolor=red]{hyperref}
\\usepackage[alphabetic,nobysame]{amsrefs}

% Math packages
\\usepackage{amsmath,amssymb,amsthm,amsfonts,mathtools}
\\usepackage{upgreek}
\\usepackage[mathscr]{euscript}
\\usepackage{esint}  % For special integrals

% Graphics packages
\\usepackage{graphicx,color}
\\usepackage{tikz}
\\usetikzlibrary{shapes,arrows,positioning,decorations.markings}

% Convenience packages
\\usepackage{array}
\\usepackage{adjustbox}
\\usepackage{cleveref}
\\usepackage{enumerate}
\\usepackage{datetime}
\\usepackage{comment}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Equations
\\allowdisplaybreaks
\\numberwithin{equation}{chapter}  % Changed from section to chapter

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% This paper specific
\\newcommand{\\ssp}{\\hspace{1pt}}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Theorem environments
\\newtheorem{proposition}{Proposition}[chapter]  % Changed from section to chapter
\\newtheorem{lemma}[proposition]{Lemma}
\\newtheorem{corollary}[proposition]{Corollary}
\\newtheorem{theorem}[proposition]{Theorem}

\\theoremstyle{definition}
\\newtheorem{definition}[proposition]{Definition}
\\newtheorem{remark}[proposition]{Remark}
\\newtheorem{example}[proposition]{Example}

% Exclude lecture notes for the final book
\\newenvironment{lnotes}{\\section*{Notes for the lecturer}}{}
\\excludecomment{lnotes}
""")

        # Begin document
        book.write("\n\\begin{document}\n\n")

        # Add book title and TOC
        book.write("\\title{Lectures on Random Matrices (Spring 2025)}\n")
        book.write("\\author{Leonid Petrov}\n")
        book.write("\\date{Spring 2025}\n")
        book.write("\\maketitle\n")
        book.write("\\tableofcontents\n\n")

        # Get the last lecture file for bibliography handling
        last_lecture_file = existing_files[-1] if existing_files else None
        last_lecture_num = int(re.search(r'l(\d+)', last_lecture_file).group(1)) if last_lecture_file else None

        # Process each lecture
        for lecture_file in existing_files:
            print(f"Processing {lecture_file}")

            # Extract lecture title and number
            lecture_num = int(re.search(r'l(\d+)', lecture_file).group(1))
            title = extract_lecture_title(lecture_file)

            # Set chapter title (without "Lecture X:")
            chapter_title = title

            # Add chapter heading and label
            book.write(f"\\chapter{{{chapter_title}}}\n")
            book.write(f"\\label{{chap:lecture{lecture_num}}}\n")

            # Add lecture content with updated references
            content = extract_lecture_content(lecture_file)
            content = update_lecture_references(content, lecture_num)
            content = sanitize_problem_sections(content)
            book.write(content)
            book.write("\n\n")

        # Add bibliography at the very end, after all lectures
        book.write("\\bibliographystyle{alpha}\n")
        book.write("\\bibliography{bib}\n\n")

        # Add author information
        book.write("\\medskip\n\n")
        book.write("\\textsc{L. Petrov, University of Virginia, Department of Mathematics, 141 Cabell Drive, Kerchof Hall, P.O. Box 400137, Charlottesville, VA 22904, USA}\n\n")
        book.write("E-mail: \\texttt{lenia.petrov@gmail.com}\n\n")

        # End document
        book.write("\\end{document}\n")

    print(f"Book LaTeX file created: {output_file}")
    return True

def compile_book():
    """Compile the book using latexmk"""
    print("Compiling book...")
    try:
        # Run latexmk which handles pdflatex, bibtex, and multiple runs automatically
        subprocess.run(["latexmk", "-pdf", output_file], check=True)
        print(f"Book compiled successfully: {output_file.replace('.tex', '.pdf')}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error compiling book: {e}")
        return False

def upload_to_aws():
    """Upload the compiled PDF to AWS S3"""
    pdf_file = output_file.replace('.tex', '.pdf')
    s3_destination = "s3://lpetrov.cc.storage/papers/lec07-rmt2025-lectures-combined.pdf"

    print(f"Uploading {pdf_file} to AWS S3...")
    try:
        subprocess.run(["aws", "s3", "cp", pdf_file, s3_destination], check=True)
        print(f"Successfully uploaded to {s3_destination}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error uploading to AWS: {e}")
        return False

if __name__ == "__main__":
    if create_book() and compile_book():
        upload_to_aws()
