## LCF2xml
Some comment here: https://community.easyrpg.org/t/cyrillic-font-problem/138/13
mentioned that lcf2xml will respect the `RPG_RT.ini` settings and convert the binary format with character encoding based on `RPG_RG.ini` setting.

## UTF8
In `RPG_RT.ini` file add the following code:
```ini
[EasyRPG]
Encoding=65001
```