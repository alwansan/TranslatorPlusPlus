import requests
from tqdm import tqdm
import os
import sys
from os.path import abspath, isdir, join
import time

#===========================================================
# HANDLING ARGUMENTS
#===========================================================
# Remove 1st argument from the
# list of command line arguments
argumentList = sys.argv[1:]

saveTo = abspath(argumentList[1])
print("Downloading:", argumentList[0])
print("To: ", saveTo)

def download(url: str, directory: str):
    headers = {}

    # Extract filename from the URL
    filename = url.split("/")[-1]

    # If the target is a directory, construct the complete path
    if isdir(directory):
        filepath = join(directory, filename)
        temp_filepath = join(directory, f"{filename}.temp")
    else:
        filepath = directory
        temp_filepath = f"{directory}.temp"

    # Check if the file already exists
    resume = os.path.exists(temp_filepath)

    # If resuming, set the Range header
    if resume:
        resume_header = {'Range': 'bytes=%d-' % os.path.getsize(temp_filepath)}
        headers.update(resume_header)

    resp = requests.get(url, headers=headers, stream=True)

    # Check if the server supports resuming
    if resume:
        if resp.status_code != 206 or resp.headers.get('Accept-Ranges') != 'bytes':
            # Server does not support resuming, redownload the whole file
            print("Server does not support resuming. Redownloading the whole file.")
            resume = False

    total = int(resp.headers.get('content-length', 0))

    with open(temp_filepath, 'ab') as file, tqdm(
            desc=filename,
            total=total,
            unit='iB',
            unit_scale=True,
            unit_divisor=1024,
    ) as bar:
        for data in resp.iter_content(chunk_size=1024):
            size = file.write(data)
            bar.update(size)

    # Rename the file once the download is complete
    os.rename(temp_filepath, filepath)

if __name__ == "__main__":
    download(argumentList[0], saveTo)
    time.sleep(1)