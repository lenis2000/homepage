#!/usr/bin/env python3

import re
import sys

def parse_heuristic_results(file_path):
    """Parse the heuristic results file and extract partition and dimension data by size."""
    results = {}
    current_size = None
    
    with open(file_path, 'r') as f:
        for line in f:
            # Match the size header
            size_match = re.match(r'--- Size (\d+) ---', line)
            if size_match:
                current_size = int(size_match.group(1))
            
            # Match the max dimension line
            dim_match = re.match(r'Max f\^lambda: (\d+(\.\d+)?([eE][+-]?\d+)?)', line)
            if dim_match and current_size:
                results[current_size] = {'dimension': dim_match.group(1)}
            
            # Match the partition line
            partition_match = re.match(r'Partitions achieving maximum: \[([\d, ]+)\]', line)
            if partition_match and current_size and current_size in results:
                partition = [int(x.strip()) for x in partition_match.group(1).split(',')]
                results[current_size]['partition'] = partition
    
    return results

def update_max_n_value(content, max_n):
    """Update the max value for the size-n input field in the HTML."""
    # Find the input element for size-n
    input_pattern = r'<input type="number" class="form-control" id="size-n" min="1" max="(\d+)" value="10" required>'
    match = re.search(input_pattern, content)
    
    if not match:
        print("Could not find the size-n input element in the file.")
        return content
    
    # Replace the max value
    updated_content = re.sub(input_pattern, 
                            f'<input type="number" class="form-control" id="size-n" min="1" max="{max_n}" value="10" required>',
                            content)
    
    return updated_content

def update_partitions_in_js(content, updated_data):
    """Update the partition data in the JavaScript section of the markdown file."""
    # Find the partitionData object in the JS code
    partition_data_pattern = r'(const partitionData = \{)[\s\S]*?(\}\;)'
    match = re.search(partition_data_pattern, content)
    
    if not match:
        print("Could not find partitionData object in the file.")
        return content
    
    # Extract the start and end of the partitionData object
    partition_data_start = match.group(1)
    partition_data_end = "};";
    
    # Construct the new partitionData object
    new_partition_data = partition_data_start + "\n"
    
    # Build the new entries for all sizes
    all_sizes = sorted(updated_data.keys())
    
    for i, size in enumerate(all_sizes):
        # Format the data
        partition_str = ", ".join([str(x) for x in updated_data[size]['partition']])
        dimension_str = updated_data[size]['dimension']
        
        # Add the entry
        if i == len(all_sizes) - 1:  # Last entry doesn't have a comma
            new_partition_data += f"    {size}: {{\n      partition: [{partition_str}],\n      dimension: {dimension_str}\n    }}"
        else:
            new_partition_data += f"    {size}: {{\n      partition: [{partition_str}],\n      dimension: {dimension_str}\n    }},\n"
    
    new_partition_data += "\n  " + partition_data_end
    
    # Replace the old partitionData with the new one
    updated_content = re.sub(partition_data_pattern, new_partition_data, content)
    
    return updated_content

def main():
    if len(sys.argv) != 3:
        print("Usage: python update_heuristics.py <heuristic_results_file> <dim_lambda_md_file>")
        sys.exit(1)
    
    heuristic_file = sys.argv[1]
    md_file = sys.argv[2]
    
    # Parse the heuristic results
    results = parse_heuristic_results(heuristic_file)
    
    if not results:
        print("No valid data found in heuristic results file.")
        sys.exit(1)
    
    # Read the markdown file
    with open(md_file, 'r') as f:
        content = f.read()
    
    # Update the max n value in the HTML
    max_n = max(results.keys())
    updated_content = update_max_n_value(content, max_n)
    
    # Update the partition data
    updated_content = update_partitions_in_js(updated_content, results)
    
    # Write the updated content back to the file
    with open(md_file, 'w') as f:
        f.write(updated_content)
    
    print(f"Successfully updated {md_file} with data from {heuristic_file}")
    print(f"Updated {len(results)} partition entries")
    print(f"Set max n value to {max_n}")

if __name__ == "__main__":
    main()