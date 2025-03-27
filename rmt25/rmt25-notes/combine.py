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

    # Remove title, date, author, maketitle
    content = re.sub(r'\\title\{.*?\}.*?\\maketitle', '', content, flags=re.DOTALL)

    # Remove TOC if present
    content = re.sub(r'\\tableofcontents', '', content)

    # Remove abstract environment
    content = re.sub(r'\\begin\{abstract\}(.*?)\\end\{abstract\}', '', content, flags=re.DOTALL)

    # Remove bibliography and author information
    content = re.sub(r'\\bibliographystyle\{[^}]*\}', '', content)
    content = re.sub(r'\\bibliography\{[^}]*\}', '', content)
    content = re.sub(r'\\medskip\s+\\textsc\{L\.\s+Petrov[^}]*\}', '', content, flags=re.DOTALL)
    content = re.sub(r'E-mail:\s*\\texttt\{[^}]*\}', '', content)

    # Remove appendix commands
    content = re.sub(r'\\appendix', '', content)

    # We do NOT do any partial fixes to labels here, since we
    # will systematically rename them with a new function.

    return content

def rename_labels_and_refs(content, lecture_num):
    """
    Systematically rename all labels from \label{XYZ} to \label{lectureN:XYZ}
    for the current lecture. Also rename any references to match.
    This ensures there are no duplicate labels across different lectures.
    """

    # 1. Rename labels (except chapter labels like \label{chap:lectureN})
    label_pattern = re.compile(
        r'(\\label\{)(?!chap:lecture)([^}]+)\}'
    )
    def label_replacer(m):
        prefix = f'lecture{lecture_num}:'
        old_label = m.group(2)
        # If it already has the correct prefix, leave it
        if old_label.startswith(prefix):
            return m.group(1) + old_label + '}'
        return m.group(1) + prefix + old_label + '}'

    content = label_pattern.sub(label_replacer, content)

    # 2. Rename references: \ref, \eqref, \Cref, \cref, \autoref, \pageref, etc.
    #    We skip references to chap:lectureN, as those are the chapter labels.
    ref_pattern = re.compile(
        r'(\\(ref|Cref|cref|autoref|eqref|pageref)\{)([^}]+)\}'
    )
    def ref_replacer(m):
        prefix = f'lecture{lecture_num}:'
        old_label = m.group(3)
        if old_label.startswith("chap:lecture") or old_label.startswith(prefix):
            # Already references the chapter or has our prefix -> leave unchanged
            return m.group(1) + old_label + '}'
        # Otherwise add the lecture-based prefix
        return m.group(1) + prefix + old_label + '}'

    content = ref_pattern.sub(ref_replacer, content)

    return content

def update_lecture_references(content, lecture_num):
    """Convert href references to other lectures into \Cref{chap:lectureX} references."""
    # Pattern for href references to lecture PDFs
    pattern = r'\\href\{https://lpetrov\.cc/rmt25/rmt25-notes/rmt2025-l(\d+)\.pdf\}\{([^{}]*)\}'
    def replacement(match):
        target_lecture_num = int(match.group(1))
        link_text = match.group(2)
        # If it's a reference to the TeX Source, keep that reference as is
        if "TeX Source" in link_text:
            return match.group(0)
        # Otherwise, reference the chapter label of that lecture
        return f'\\Cref{{chap:lecture{target_lecture_num}}}'

    return re.sub(pattern, replacement, content)

def extract_lecture_title(filename):
    """Extract the title of a lecture from the file"""
    with open(filename, 'r') as f:
        content = f.read()

    # Pattern 1: \title{... \\Lecture X: Title}
    title_match = re.search(r'\\title\{.*?\\\\Lecture \d+: (.*?)\}', content, flags=re.DOTALL)
    if title_match:
        return title_match.group(1).strip()

    # Pattern 2: \title{... Lecture X: Title}
    alt_title_match = re.search(r'\\title\{.*?Lecture \d+: (.*?)\}', content, flags=re.DOTALL)
    if alt_title_match:
        return alt_title_match.group(1).strip()

    return "Lecture Content"  # Fallback

def sanitize_problem_sections(content):
    """Fix common LaTeX errors in problem sections and remove due dates"""
    # Remove any \setcounter{section}{...}
    content = re.sub(r'\\setcounter\{section\}\{\d+\}', '', content)

    # Remove due dates from problem sections
    content = re.sub(r'\\section\{Problems \(due [^)]*\)\}', r'\\section{Problems}', content)

    # Clean up any leftover weird nested braces in labels, if they exist
    content = re.sub(r'\\label\{(\{+)(.*?)(\}*)\}', r'\\label{\2}', content)

    return content

def create_book():
    """Create a unified book from lecture files"""
    # Identify which lecture files exist
    existing_files = [f for f in lecture_files if os.path.exists(f)]
    if not existing_files:
        print("Error: No lecture files found")
        return False

    with open(output_file, 'w') as book:
        # -----------------
        # Unified preamble
        # -----------------
        book.write(r"""\documentclass[letterpaper,11pt,oneside,reqno]{book}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Packages from the original lectures

% Core packages
\usepackage[pdftex,backref=page,colorlinks=true,linkcolor=blue,citecolor=red]{hyperref}
\usepackage[alphabetic,nobysame]{amsrefs}

% Math packages
\usepackage{amsmath,amssymb,amsthm,amsfonts,mathtools}
\usepackage{upgreek}
\usepackage[mathscr]{euscript}
\usepackage{esint}  % For special integrals

% Graphics packages
\usepackage{graphicx,color}
\usepackage{tikz}
\usetikzlibrary{shapes,arrows,positioning,decorations.markings}

% Convenience packages
\usepackage{array}
\usepackage{adjustbox}
\usepackage{cleveref}
\usepackage{enumerate}
\usepackage{datetime}
\usepackage{comment}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Equations
\allowdisplaybreaks
\numberwithin{equation}{chapter}  % Changed from section to chapter

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% This paper specific
\newcommand{\ssp}{\hspace{1pt}}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Theorem environments
\newtheorem{proposition}{Proposition}[chapter]  % Changed from section to chapter
\newtheorem{lemma}[proposition]{Lemma}
\newtheorem{corollary}[proposition]{Corollary}
\newtheorem{theorem}[proposition]{Theorem}

\theoremstyle{definition}
\newtheorem{definition}[proposition]{Definition}
\newtheorem{remark}[proposition]{Remark}
\newtheorem{example}[proposition]{Example}

% Exclude lecture notes for the final book
\newenvironment{lnotes}{\section*{Notes for the lecturer}}{}
\excludecomment{lnotes}
""")

        book.write("\n\\begin{document}\n\n")

        # Title, author, date, and TOC for the combined book
        book.write("\\title{Lectures on Random Matrices (Spring 2025)}\n")
        book.write("\\author{Leonid Petrov}\n")
        book.write("\\date{Spring 2025}\n")
        book.write("\\maketitle\n")
        book.write("\\tableofcontents\n\n")

        # Track the last lecture for where we might get the final bibliography
        last_lecture_file = existing_files[-1] if existing_files else None

        # -----------------
        # Combine Lectures
        # -----------------
        for lecture_file in existing_files:
            print(f"Processing {lecture_file} ...")

            # Extract lecture number from filename
            lecture_num_match = re.search(r'l(\d+)', lecture_file)
            if not lecture_num_match:
                continue  # skip if we can't parse a number
            lecture_num = int(lecture_num_match.group(1))

            # Extract the lecture title (string only)
            title = extract_lecture_title(lecture_file)

            # Insert a new chapter for each lecture
            book.write(f"\\chapter{{{title}}}\n")
            book.write(f"\\label{{chap:lecture{lecture_num}}}\n")

            # Extract raw content
            content = extract_lecture_content(lecture_file)

            # Convert any \href references to \Cref
            content = update_lecture_references(content, lecture_num)

            # Fix problem section formatting
            content = sanitize_problem_sections(content)

            # **Crucially** rename labels & references to avoid duplicates
            content = rename_labels_and_refs(content, lecture_num)

            # Finally, write to the combined file
            book.write(content)
            book.write("\n\n")

        # -----------------
        # Bibliography
        # -----------------
        book.write("\\bibliographystyle{alpha}\n")
        book.write("\\bibliography{bib}\n\n")

        # -----------------
        # Author Info
        # -----------------
        book.write("\\medskip\n\n")
        book.write("\\textsc{L. Petrov, University of Virginia, Department of Mathematics, 141 Cabell Drive, Kerchof Hall, P.O. Box 400137, Charlottesville, VA 22904, USA}\n\n")
        book.write("E-mail: \\texttt{lenia.petrov@gmail.com}\n\n")

        # -----------------
        # End of document
        # -----------------
        book.write("\\end{document}\n")

    print(f"Book LaTeX file created: {output_file}")
    return True

def compile_book():
    """Compile the book using latexmk"""
    print("Compiling book...")
    try:
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
