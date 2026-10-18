## EasyRPG utility's quirk
- EasyRPG will load the xml file first if exist in the directory then load the compiled binary.
- The working workflow is:
    - Load RM2k/2k3 binary using lcf2xml using whatever character encoding the game currently is.
    - Translate it
    - Dump the xml file with UTF-8 LF encoding
    - Compile the xml files into binary using lcf2xml with utf8 flag.
    - The game will be playable with EasyRPG player in UTF8 character encoding