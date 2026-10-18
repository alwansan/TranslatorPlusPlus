// patchScript.js

const shell = require('shelljs');

// Run WolfTL.exe
shell.exec('.\\WolfTL.exe "D:\\Test\\Wolf\\onetyann\\お姉ちゃん-extracted\\Data" "D:\\Test\\Wolf\\onetyann\\お姉ちゃん-output" patch');

// Recursively copy files
shell.cp('-R', 'D:\\Test\\Wolf\\onetyann\\お姉ちゃん-output\\patched\\*', 'D:\\Test\\Wolf\\onetyann\\お姉ちゃん-patched');
console.log('Files copied successfully!');
