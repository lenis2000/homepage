#!/usr/bin/env python3

import re
import sys
import math
import json
from decimal import Decimal, getcontext, Context, ROUND_HALF_UP

# Set extremely high precision for decimal calculations
getcontext().prec = 1000  # Increased from 100 to 1000 for super long arithmetic

# Create a special context for even higher precision operations if needed
high_precision_context = Context(prec=2000, rounding=ROUND_HALF_UP)

def log_factorial(n):
    """Calculate the natural logarithm of n! using math.log."""
    if n <= 1:
        return 0
    return sum(math.log(i) for i in range(1, n + 1))

def calculate_c_lambda(dimension_str, n):
    """Calculate c(lambda) = -log(f^lambda/sqrt(n!))/sqrt(n) with very high precision."""
    # Parse the dimension, handling scientific notation
    if 'e' in dimension_str.lower():
        # Handle scientific notation
        mantissa, exponent = dimension_str.lower().split('e')
        mantissa = Decimal(mantissa)
        exponent = int(exponent.replace('+', ''))
        # Don't use high precision context for logarithm calculation as it doesn't support it
        log_dimension = math.log(float(mantissa)) + exponent * math.log(10)
    else:
        # For smaller numbers or string representations of large integers
        try:
            # First try to convert to Decimal for high precision
            dimension_decimal = Decimal(dimension_str)
            # Get logarithm via approximation for huge numbers
            str_dim = str(dimension_decimal)
            if '.' in str_dim:
                str_dim = str_dim.replace('.', '')
            
            # Handle extremely large numbers with higher precision
            digits = len(str_dim.rstrip('0'))
            if digits <= 15:
                # For smaller numbers, direct calculation
                log_dimension = math.log(float(dimension_decimal))
            else:
                # For huge numbers, use logarithm properties
                mantissa = Decimal(str_dim[:30]) / Decimal(10)**29  # Use more digits for better precision
                exponent = digits - 1
                log_dimension = math.log(float(mantissa)) + exponent * math.log(10)
        except (ValueError, OverflowError):
            # Fallback approach for extremely large values
            str_dim = dimension_str
            if '.' in str_dim:
                str_dim = str_dim.replace('.', '')
            
            mantissa = Decimal(str_dim[:30]) / Decimal(10)**29
            exponent = len(str_dim.rstrip('0')) - 1
            log_dimension = math.log(float(mantissa)) + exponent * math.log(10)

    # Calculate log(n!) with high precision
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

def parse_existing_partition_data(content):
    """Parse the existing partition data from the JavaScript in the markdown file."""
    # Find the partitionData object in the JS code
    partition_data_pattern = r'const partitionData = \{([\s\S]*?)\}\;'
    match = re.search(partition_data_pattern, content)
    
    if not match:
        print("Could not find partitionData object in the file.")
        return {}
    
    # Extract the content of the partitionData object
    partition_data_content = match.group(1)
    
    # Regular expressions to extract data for each size
    size_pattern = r'(\d+): \{'
    partition_pattern = r'partition: \[([\d, ]+)\]'
    dimension_pattern = r'dimension: ([\d\.e\+]+)'
    c_lambda_pattern = r'c_lambda: ([\d\.\-]+)'
    
    # Find all size entries
    existing_data = {}
    for size_match in re.finditer(size_pattern, partition_data_content):
        size = int(size_match.group(1))
        
        # Find the corresponding entry block
        entry_start = size_match.start()
        next_size_match = re.search(size_pattern, partition_data_content[entry_start + 1:])
        if next_size_match:
            entry_end = entry_start + 1 + next_size_match.start()
        else:
            entry_end = len(partition_data_content)
        
        entry_block = partition_data_content[entry_start:entry_end]
        
        # Extract partition
        partition_match = re.search(partition_pattern, entry_block)
        if partition_match:
            partition = [int(x.strip()) for x in partition_match.group(1).split(',')]
        else:
            partition = []
        
        # Extract dimension
        dimension_match = re.search(dimension_pattern, entry_block)
        if dimension_match:
            dimension = dimension_match.group(1)
        else:
            dimension = "0"
        
        # Extract c_lambda if exists
        c_lambda_match = re.search(c_lambda_pattern, entry_block)
        if c_lambda_match:
            c_lambda = float(c_lambda_match.group(1))
            existing_data[size] = {'partition': partition, 'dimension': dimension, 'c_lambda': c_lambda}
        else:
            existing_data[size] = {'partition': partition, 'dimension': dimension}
    
    return existing_data

def is_dimension_larger(new_dim_str, old_dim_str):
    """Compare two dimension strings to determine if new is larger than old."""
    # Handle scientific notation and convert to Decimal for precise comparison
    try:
        # Convert both to Decimal for accurate comparison of very large numbers
        new_dim = Decimal(new_dim_str)
        old_dim = Decimal(old_dim_str)
        return new_dim > old_dim
    except (ValueError, OverflowError):
        # Fallback to string comparison for extremely large numbers
        # First check if scientific notation
        if 'e' in new_dim_str.lower() and 'e' in old_dim_str.lower():
            # Compare exponents first
            new_mantissa, new_exp = new_dim_str.lower().split('e')
            old_mantissa, old_exp = old_dim_str.lower().split('e')
            
            new_exp = int(new_exp.replace('+', ''))
            old_exp = int(old_exp.replace('+', ''))
            
            if new_exp != old_exp:
                return new_exp > old_exp
            
            # If exponents are equal, compare mantissas
            return Decimal(new_mantissa) > Decimal(old_mantissa)
        
        # If one has scientific notation and the other doesn't
        if 'e' in new_dim_str.lower():
            # Scientific notation is likely larger
            return True
        
        if 'e' in old_dim_str.lower():
            # Old is in scientific notation, likely larger
            return False
        
        # Last resort: compare string lengths (rough approximation)
        if len(new_dim_str.rstrip('0')) != len(old_dim_str.rstrip('0')):
            return len(new_dim_str.rstrip('0')) > len(old_dim_str.rstrip('0'))
        
        # If same length, compare digit by digit
        return new_dim_str > old_dim_str

def update_partitions_in_js(content, updated_data):
    """Update the partition data in the JavaScript section of the markdown file 
    ONLY if the dimension is bigger than before."""
    # First parse the existing partition data
    existing_data = parse_existing_partition_data(content)
    
    # Find the partitionData object in the JS code
    partition_data_pattern = r'(const partitionData = \{)[\s\S]*?(\}\;)'
    match = re.search(partition_data_pattern, content)
    
    if not match:
        print("Could not find partitionData object in the file.")
        return content
    
    # Extract the start and end of the partitionData object
    partition_data_start = match.group(1)
    partition_data_end = "};";
    
    # Merge updated data with existing data, keeping the larger dimension
    final_data = existing_data.copy()
    
    # Track statistics for reporting
    updated_count = 0
    skipped_count = 0
    
    for size in updated_data:
        if (size not in existing_data or 
            is_dimension_larger(updated_data[size]['dimension'], existing_data[size]['dimension'])):
            final_data[size] = updated_data[size]
            updated_count += 1
            print(f"Size {size}: Updating with larger dimension {updated_data[size]['dimension']}")
        else:
            # Keep existing data, but update c_lambda if it exists in new data
            if 'c_lambda' in updated_data[size] and ('c_lambda' not in existing_data[size] or 
                                                   updated_data[size]['c_lambda'] != existing_data[size]['c_lambda']):
                final_data[size]['c_lambda'] = updated_data[size]['c_lambda']
                print(f"Size {size}: Keeping existing dimension but updating c_lambda")
            else:
                skipped_count += 1
                print(f"Size {size}: Skipping update as existing dimension {existing_data[size]['dimension']} is larger or equal")
    
    # Construct the new partitionData object
    new_partition_data = partition_data_start + "\n"
    
    # Build the new entries for all sizes
    all_sizes = sorted(final_data.keys())
    
    for i, size in enumerate(all_sizes):
        # Format the data
        partition_str = ", ".join([str(x) for x in final_data[size]['partition']])
        dimension_str = final_data[size]['dimension']
        
        # Add the entry with c_lambda for large n values
        if 'c_lambda' in final_data[size]:
            if i == len(all_sizes) - 1:  # Last entry doesn't have a comma
                new_partition_data += f"    {size}: {{\n      partition: [{partition_str}],\n      dimension: {dimension_str},\n      c_lambda: {final_data[size]['c_lambda']}\n    }}"
            else:
                new_partition_data += f"    {size}: {{\n      partition: [{partition_str}],\n      dimension: {dimension_str},\n      c_lambda: {final_data[size]['c_lambda']}\n    }},\n"
        else:
            if i == len(all_sizes) - 1:  # Last entry doesn't have a comma
                new_partition_data += f"    {size}: {{\n      partition: [{partition_str}],\n      dimension: {dimension_str}\n    }}"
            else:
                new_partition_data += f"    {size}: {{\n      partition: [{partition_str}],\n      dimension: {dimension_str}\n    }},\n"
    
    new_partition_data += "\n  " + partition_data_end
    
    # Replace the old partitionData with the new one
    updated_content = re.sub(partition_data_pattern, new_partition_data, content)
    
    print(f"\nSummary of updates:")
    print(f"- Entries updated with larger dimensions: {updated_count}")
    print(f"- Entries skipped (existing dimension is larger or equal): {skipped_count}")
    
    return updated_content

def main():
    if len(sys.argv) != 3:
        print("Usage: python update_heuristics_with_clambda.py <heuristic_results_file> <dim_lambda_md_file>")
        sys.exit(1)
    
    heuristic_file = sys.argv[1]
    md_file = sys.argv[2]
    
    # Parse the heuristic results
    print("Parsing heuristic results and calculating c(lambda) values with super high precision...")
    results = parse_heuristic_results(heuristic_file)
    
    if not results:
        print("No valid data found in heuristic results file.")
        sys.exit(1)
    
    # Read the markdown file
    print(f"Reading markdown file: {md_file}")
    with open(md_file, 'r') as f:
        content = f.read()
    
    # Update the max n value in the HTML
    max_n = max(results.keys())
    print(f"Updating max n value to {max_n}...")
    updated_content = update_max_n_value(content, max_n)
    
    # Update the partition data with pre-computed c(lambda) values, only if dimensions are larger
    print("\nUpdating partition data (only if dimensions are larger)...")
    updated_content = update_partitions_in_js(updated_content, results)
    
    # Write the updated content back to the file
    print(f"\nWriting updated content back to {md_file}...")
    with open(md_file, 'w') as f:
        f.write(updated_content)
    
    # Count how many c_lambda values were added
    c_lambda_count = sum(1 for size in results if 'c_lambda' in results[size])
    
    print(f"\n=== SUMMARY ===")
    print(f"Successfully updated {md_file} with data from {heuristic_file}")
    print(f"Processed {len(results)} partition entries from heuristic file")
    print(f"Pre-computed c(lambda) values for {c_lambda_count} large n values")
    print(f"Set max n value to {max_n}")
    print(f"Note: Only entries with larger dimensions than existing ones were updated")

if __name__ == "__main__":
    main()