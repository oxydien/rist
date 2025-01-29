"""
# Binary Diff Checker

Created to check the difference between original files and uploaded/downloaded files.

Keeping it here just in case.

## Basic Usage
```python
file1 = "/path/to/file1"
file2 = "/path/to/file2"
binary_diff(file1, file2)
```
"""

def binary_diff(file1_path, file2_path, chunk_size=4096, max_differences=100):
    """
    Find binary differences between two large files and show up to max_differences.
    
    :param file1_path: Path to the first file
    :param file2_path: Path to the second file
    :param chunk_size: Size of chunks to read at a time
    :param max_differences: Maximum number of differences to display
    """
    differences_found = 0 

    try:
        with open(file1_path, 'rb') as file1, open(file2_path, 'rb') as file2:
            offset = 0
            while True:
                chunk1 = file1.read(chunk_size)
                chunk2 = file2.read(chunk_size)

                # End of files
                if not chunk1 and not chunk2:
                    break

                # Compare chunks byte by byte
                for i, (byte1, byte2) in enumerate(zip(chunk1, chunk2)):
                    if byte1 != byte2:
                        hex_offset = f"0x{offset + i:08x}"
                        print(f"Difference at offset {hex_offset}: File1=0x{byte1:02x}, File2=0x{byte2:02x}")
                        differences_found += 1
                        if differences_found >= max_differences:
                            print("Reached the maximum number of differences to display.")
                            return

                # Handle EOF in mismatched chunk lengths
                if len(chunk1) != len(chunk2):
                    shorter_chunk_len = min(len(chunk1), len(chunk2))
                    longer_chunk = chunk1 if len(chunk1) > len(chunk2) else chunk2
                    file_label = "File1" if len(chunk1) > len(chunk2) else "File2"
                    for j in range(shorter_chunk_len, len(longer_chunk)):
                        hex_offset = f"0x{offset + j:08x}"
                        print(f"Difference at offset {hex_offset}: {file_label}=0x{longer_chunk[j]:02x}, Other=EOF")
                        differences_found += 1
                        if differences_found >= max_differences:
                            print("Reached the maximum number of differences to display.")
                            return

                offset += chunk_size

        if differences_found == 0:
            print("No differences found between the files.")
    except FileNotFoundError as e:
        print(f"Error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

# Usage
file1 = "/path/to/file1"
file2 = "/path/to/file2"
binary_diff(file1, file2)
