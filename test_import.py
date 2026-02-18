import sys
import os
import signal

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

print("Attempting to import main...")
try:
    import main
    print("Import successful!")
except Exception as e:
    print(f"Import failed: {e}")
