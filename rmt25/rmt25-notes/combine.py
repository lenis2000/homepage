#!/usr/bin/env python3
import os
import re
import subprocess

# Configuration
num_lectures = 15
output_file = "rmt2025-book.tex"
lecture_files = [f"rmt2025-l{i:02d}.tex" for i in range(1, num_lectures + 1)]

def extract_packages(content):
    """Extract all \usepackage commands from content"""
    packages = []
    pattern = r'\\usepackage(\[.*?\])?\{.*?\}'
    matches = re.finditer(pattern, content)
    for match in matches:
        packages.append(match.group(0))
    return packages

def extract_preamble_without_packages(filename):
    """Extract the preamble without \usepackage commands"""
    with open(filename, 'r') as f:
        content = f.read()

    match = re.search(r'(.*?)\\begin{document}', content, re.DOTALL)
    if not match:
        return ""

    preamble = match.group(1)
    # Remove all \usepackage commands
    preamble = re.sub(r'\\usepackage(\[.*?\])?\{.*?\}\n?', '', preamble)
    return preamble

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

    # Check for and fix unbalanced braces in the content
    # This is a simple check that might not catch all issues
    brace_count = 0
    for char in content:
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1

    # If we have unbalanced braces, try to identify and fix problematic sections
    if brace_count != 0:
        print(f"Warning: Found unbalanced braces in {filename}, attempting to fix.")

        # Find probable problematic areas - especially in labels and refs
        content = re.sub(r'\\label\{([^{}]*)\{([^{}]*)', r'\\label{\1\2}', content)
        content = re.sub(r'\\ref\{([^{}]*)\{([^{}]*)', r'\\ref{\1\2}', content)
        content = re.sub(r'\\Cref\{([^{}]*)\{([^{}]*)', r'\\Cref{\1\2}', content)

        # Fix common problematic patterns in appendix sections
        content = re.sub(r'(\\section\{[^{}]*)\{([^{}]*)', r'\1\\{}\2', content)
        content = re.sub(r'(\\subsection\{[^{}]*)\{([^{}]*)', r'\1\\{}\2', content)

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

    # Fix potential label issues in appendix sections
    # Look for problematic label patterns like {{A.3 (missing closing brace)
    label_pattern = r'\\label\{([^{}]*\{[^{}]*)'
    updated_content = re.sub(label_pattern, lambda m: f'\\label{{{m.group(1)}}}', updated_content)

    # Fix other common issues with labels
    updated_content = re.sub(r'\\label\s*\{([^{}]*)\}', r'\\label{\1}', updated_content)

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

def check_for_special_commands(file_list):
    """Check if any lecture files contain specific commands that need extra packages"""
    special_commands = {
        r'\\oiint': '\\usepackage{esint}  % For surface integral symbols',
        r'\\oint': '\\usepackage{esint}  % For contour integral symbols'
    }

    needed_packages = []

    # Check each file for each symbol
    for file in file_list:
        if not os.path.exists(file):
            continue

        with open(file, 'r') as f:
            content = f.read()

        for pattern, package in special_commands.items():
            if re.search(pattern, content) and package not in needed_packages:
                needed_packages.append(package)

    return needed_packages

def organize_packages(package_list):
    """Organize the package list in a logical order and remove duplicates"""
    # Remove duplicates while preserving order
    unique_packages = []
    seen = set()
    for package in package_list:
        # Extract package name for deduplication
        match = re.search(r'\\usepackage(?:\[.*?\])?\{(.*?)\}', package)
        if match:
            package_name = match.group(1)
            if package_name not in seen:
                seen.add(package_name)
                unique_packages.append(package)

    # Sort packages into categories (basic, math, graphics, etc.)
    # This is a simple example; you might want to expand this
    categories = {
        'core': ['article', 'book', 'report', 'letter', 'typearea', 'hyperref', 'geometry'],
        'math': ['amsmath', 'amssymb', 'amsthm', 'amsfonts', 'mathtools', 'upgreek', 'euscript', 'esint'],
        'graphics': ['graphicx', 'color', 'tikz'],
        'convenience': ['array', 'adjustbox', 'cleveref', 'enumerate', 'datetime', 'comment']
    }

    # Initialize organized list with categories
    organized = {'core': [], 'math': [], 'graphics': [], 'convenience': [], 'other': []}

    # Categorize each package
    for package in unique_packages:
        categorized = False
        for category, pkg_list in categories.items():
            for pkg in pkg_list:
                if f'{{{pkg}}}' in package or f'[{pkg}]' in package:
                    organized[category].append(package)
                    categorized = True
                    break
            if categorized:
                break
        if not categorized:
            organized['other'].append(package)

    # Combine all categories into a single list
    result = []
    for category in ['core', 'math', 'graphics', 'convenience', 'other']:
        if organized[category]:
            result.extend(organized[category])
            result.append('')  # Add empty line between categories

    return result

def sanitize_appendix(content):
    """Fix common LaTeX errors in appendix sections"""
    # Fix specific problematic appendix labels
    content = re.sub(r'\\label\{\{A\.3', r'\\label{appA3', content)
    content = re.sub(r'\\label\{\{A\.(\d+)', r'\\label{appA\1', content)

    # Fix any appendix section that might be causing issues
    content = re.sub(r'\\section\{Problems \(due', r'\\section{Problems (due', content)

    # Fix potential issues with appendix environment
    if '\\appendix' in content and '\\setcounter{section}{0}' in content:
        # Ensure the appendix command is properly formatted
        content = re.sub(r'\\appendix\s*\\setcounter\{section\}\{0\}',
                         r'\\appendix\n\\setcounter{section}{0}', content)

    return content

def create_book():
    """Create a unified book from lecture files"""
    # Get the list of existing lecture files
    existing_files = [f for f in lecture_files if os.path.exists(f)]
    if not existing_files:
        print("Error: No lecture files found")
        return False

    # Get base preamble from first lecture (without packages)
    base_preamble = extract_preamble_without_packages(existing_files[0])

    # Change document class from article to book
    base_preamble = re.sub(
        r'\\documentclass\[letterpaper,11pt,oneside,reqno\]\{article\}',
        r'\\documentclass[letterpaper,11pt,twoside,reqno]{book}',
        base_preamble
    )

    # Add additional commands that might help with appendix issues
    base_preamble += "\n\n% Added to help with appendix handling\n"
    base_preamble += "\\newcommand{\\sectionbreak}{\\clearpage}\n"

    # Collect all packages from all files
    all_packages = []
    for file in existing_files:
        with open(file, 'r') as f:
            content = f.read()
        packages = extract_packages(content)
        all_packages.extend(packages)

    # Add any special packages needed for commands found in the files
    special_packages = check_for_special_commands(existing_files)
    all_packages.extend(special_packages)

    # Organize packages
    organized_packages = organize_packages(all_packages)

    # Create book content
    with open(output_file, 'w') as book:
        # Write document class
        book.write(re.search(r'\\documentclass.*\n', base_preamble).group(0))
        book.write("\n% Packages organized by the compilation script\n")

        # Write organized packages
        for package in organized_packages:
            if package:  # Skip empty strings (category separators)
                book.write(package + "\n")
            else:
                book.write("\n")  # Empty line between categories

        # Write the rest of the preamble (excluding document class)
        remaining_preamble = re.sub(r'\\documentclass.*\n', '', base_preamble)
        book.write("\n" + remaining_preamble)

        # Begin document
        book.write("\n\\begin{document}\n\n")

        # Add book title and TOC
        book.write("\\title{Lectures on Random Matrices (Spring 2025)}\n")
        book.write("\\author{Leonid Petrov}\n")
        book.write("\\date{Spring 2025}\n")
        book.write("\\maketitle\n")
        book.write("\\tableofcontents\n\n")

        # Process each lecture
        for lecture_file in existing_files:
            print(f"Processing {lecture_file}")

            # Extract lecture title and number
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
            content = sanitize_appendix(content)
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
