First i want to say Thank you to Steveju, love your work !

I had the same problem and i got it working somehow. I can’t be sure if it will work for you but i can tell you exactly how i did it.

I’ll include all the steps, I’m pretty sure you mostly know all this stuff. I want to make it easy as possible if other people might have the same issue.

Since my post is getting pretty long there is a summary at the end, if you don’t need the whole explanation. Also I’m not a native English speaker, sorry in advance about all my mistakes

So first i went on this page [http://www.ulmf.org/bbs/showthread.php?t=30720][1]

You have to create an account and download DxaDecodeDEC, DxaEncodeDEC.zip and tool.zip

Then you have to switch your non-Unicode language to Japanese here how you do it :

In search tab type “Region” and press enter.
In new window select “Administrative”
then click on “change system locale”
Select Japanese.

After this search for cmd in the start menu, right click on it and select run as admin. You need to change for the drive you have the files you want to unpack, you can type the letter of your drive with this after ( : ) so for example its on the D drive i’ll type D: . Then go on the folder your files are in an copy the hole directory and paste it in Command prompt, for example : D:\Game\Test.

Once you got it in the right directory open tool.jar, in encode string you want to put 8P@(rO!p;s58 , click encode and then decode you want to copy the decoded string in decimals (DxaDecodeDEC). It might be a different number but you should get this number 56 80 64 40 114 79 33 112 59 115 53 56 . Now type in command prompt DxaDecodeDEC the number you got and the name of the file. For example :
DxaDecodeDEC 56 80 64 40 114 79 33 112 59 115 53 56 nameofmyfile.wolf . It should create a file with the same name and you should get the unpacked files.

Quick summary for people that don’t need all those info

Download DxaDecodeDEC, DxaEncodeDEC.zip and tool.zip here: [http://www.ulmf.org/bbs/showthread.php?t=30720][1]
Change your non-Unicode settings to japanese
Run Cmd as admin, go to the directory that your files are in Cmd
Type DxaDecodeDEC 56 80 64 40 114 79 33 112 59 115 53 56 nameofmyfile.wolf

And then enjoy !