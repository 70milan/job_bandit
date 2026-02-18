import os

FILE_PATH = 'backend/main.py'
KEY_START_MARKER = "VALID_LICENSE_KEYS = {"
KEY_END_MARKER = "}"

def scrub_file():
    if not os.path.exists(FILE_PATH):
        print(f"File not found: {FILE_PATH}")
        return

    print(f"Processing {os.path.abspath(FILE_PATH)}")
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    print(f"Read {len(lines)} lines.")
    new_lines = []
    skip = False
    
    for line in lines:
        if KEY_START_MARKER in line:
            print(f"Found start marker: {line.strip()}")
            new_lines.append("VALID_LICENSE_KEYS = set()  # Scrubbed from history\n")
            skip = True
        
        if skip and KEY_END_MARKER in line:
            print(f"Found end marker: {line.strip()}")
            skip = False
            continue
            
        if not skip:
            new_lines.append(line)

    print(f"Writing {len(new_lines)} lines.")
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

if __name__ == "__main__":
    try:
        scrub_file()
    except Exception as e:
        print(f"Error: {e}")
