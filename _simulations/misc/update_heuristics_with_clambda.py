#!/usr/bin/env python3

import re
import sys
import math
import json
from decimal import Decimal, getcontext

# Set high precision for decimal calculations
getcontext().prec = 100

def log_factorial(n):
    """Calculate the natural logarithm of n! using math.log."""
    if n <= 1:
        return 0
    return sum(math.log(i) for i in range(1, n + 1))

def calculate_c_lambda(dimension_str, n):
    """Calculate c(lambda) = -log(f^lambda/sqrt(n!))/sqrt(n)."""
    # Parse the dimension, handling scientific notation
    if 'e' in dimension_str.lower():
        # Handle scientific notation
        mantissa, exponent = dimension_str.lower().split('e')
        mantissa = float(mantissa)
        exponent = int(exponent.replace('+', ''))
        log_dimension = math.log(mantissa) + exponent * math.log(10)
    else:
        # For smaller numbers or string representations of large integers
        try:
            dimension = int(dimension_str)
            log_dimension = math.log(dimension)
        except (ValueError, OverflowError):
            # For very large integers that can't be directly converted
            # Use Decimal for arbitrary precision
            dimension_decimal = Decimal(dimension_str)
            # Get approximation by looking at the number of digits
            str_dim = str(dimension_decimal)
            if '.' in str_dim:
                str_dim = str_dim.replace('.', '')
            mantissa = float(str_dim[:15]) / 10**14  # first 15 digits normalized
            exponent = len(str_dim.rstrip('0')) - 1  # Approximate exponent
            log_dimension = math.log(mantissa) + exponent * math.log(10)

    # Calculate log(n!)
    log_n_factorial = log_factorial(n)

    # logSqrtFactorial = log(sqrt(n!)) = log(n!)/2
    log_sqrt_factorial = log_n_factorial / 2

    # c(lambda) = -log(f^lambda/sqrt(n!))/sqrt(n) = -(log(f^lambda) - log(sqrt(n!)))/sqrt(n)
    c_lambda = -(log_dimension - log_sqrt_factorial) / math.sqrt(n)
    
    # Return with 5 decimal precision
    return round(c_lambda, 5)

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
                dimension_str = dim_match.group(1)
                results[current_size] = {'dimension': dimension_str}
                
                # Calculate c(lambda) for large n values
                if current_size >= 300:  # Start pre-computing from n=300
                    try:
                        c_lambda = calculate_c_lambda(dimension_str, current_size)
                        results[current_size]['c_lambda'] = c_lambda
                    except Exception as e:
                        print(f"Warning: Could not calculate c(lambda) for n={current_size}: {e}")
            
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
        
        # Add the entry with c_lambda for large n values
        if 'c_lambda' in updated_data[size]:
            if i == len(all_sizes) - 1:  # Last entry doesn't have a comma
                new_partition_data += f"    {size}: {{\n      partition: [{partition_str}],\n      dimension: {dimension_str},\n      c_lambda: {updated_data[size]['c_lambda']}\n    }}"
            else:
                new_partition_data += f"    {size}: {{\n      partition: [{partition_str}],\n      dimension: {dimension_str},\n      c_lambda: {updated_data[size]['c_lambda']}\n    }},\n"
        else:
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
        print("Usage: python update_heuristics_with_clambda.py <heuristic_results_file> <dim_lambda_md_file>")
        sys.exit(1)
    
    heuristic_file = sys.argv[1]
    md_file = sys.argv[2]
    
    # Parse the heuristic results
    print("Parsing heuristic results and calculating c(lambda) values...")
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
    
    # Update the partition data with pre-computed c(lambda) values
    updated_content = update_partitions_in_js(updated_content, results)
    
    # Write the updated content back to the file
    with open(md_file, 'w') as f:
        f.write(updated_content)
    
    # Count how many c_lambda values were added
    c_lambda_count = sum(1 for size in results if 'c_lambda' in results[size])
    
    print(f"Successfully updated {md_file} with data from {heuristic_file}")
    print(f"Updated {len(results)} partition entries")
    print(f"Added pre-computed c(lambda) values for {c_lambda_count} large n values")
    print(f"Set max n value to {max_n}")

if __name__ == "__main__":
    main()