from flask import Flask
from flask import request
from flask_cors import CORS, cross_origin

import ctranslate2
import re
import time
import getopt, sys, os, json, signal
import sentencepiece as spm

os.system("")
CEND    = '\33[0m'
CGREY   = '\33[90m'
CRED    = '\33[91m'
CGREEN  = '\33[92m'
CYELLOW = '\33[93m'
CBLUE   = '\33[94m'
CVIOLET = '\33[35m'
CBEIGE  = '\33[36m'
CWHITE  = '\33[37m'

print(CYELLOW+"CTranslate2"+CEND+" with Sugoi Translator's pre-trained model. Flask server mod for Translator++")
print("Ver. 0.3")
print("Use arg -h to display the help menu")
print(CBLUE+"===================================================================================="+CEND)
#===========================================================
# INITIALIATION
#===========================================================
host='0.0.0.0'
port=14366
gpu= False
device = "cpu" # cuda or cpu
intra_threads=4
inter_threads=1
beam_size=3
repetition_penalty=3
sp_source_model = "fairseq/spmModels/spm.ja.nopretok.model"
sp_target_model = "fairseq/spmModels/spm.en.nopretok.model"

silent = False
disable_unk = False

def getHelp():
    print('''
Sugoi Translator with Fairseq
Mod for Translator++
=============================

CLI Args:
    -h / --help
        Displays this message

    -n / --host [hostname]
        Set the host name / ip address to listen to

    -p / --port [port number]
        Set port number

    -g / --gpu
        Run on GPU mode instead of CPU

    -b / --beam_size
        Control the beam size. Default is 3. Increase for better quality. Decrese for faster translation.

    -r / --repetition_penalty
        Control repetition penalty. Default is 3. Increase to suppress repetition.

    -u / --disable_unk
        Disable unknown token

    -s / --silent
        Suppress message.

Example:
    py startServer.py -s 127.0.0.1 -p 27027
    py startServer.py -g
    ''')

#===========================================================
# HANDLING ARGUMENTS
#===========================================================
# Remove 1st argument from the
# list of command line arguments
argumentList = sys.argv[1:]
 
# Options
options = "hsgn:p:b:r:u"
 
# Long options
long_options = ["help", "silent", "gpu", "host =", "port =", "beam_size =", "repetition_penalty =", "disable_unk"]
status = "ready"



try:
    # Parsing argument
    arguments, values = getopt.getopt(argumentList, options, long_options)
    
    # checking each argument
    for currentArgument, currentValue in arguments:

        if currentArgument in ("-h", "--Help"):
            getHelp()
            quit()
            
        elif currentArgument in ("-s", "--silent"):
            silent = True

        elif currentArgument in ("-n", "--host"):
            host = currentValue
            
        elif currentArgument in ("-p", "--port"):
            port = currentValue

        elif currentArgument in ("-g", "--gpu"):
            gpu=True
            device="cuda"
        elif currentArgument in ("-b", "--beam_size"):
            beam_size = int(currentValue)
            
        elif currentArgument in ("-r", "--repetition_penalty"):
            repetition_penalty = int(currentValue)

        elif currentArgument in ("-u", "--disable_unk"):
            disable_unk = True        

except getopt.error as err:
    # output error, and return with an error code
    print (str(err))
    print(CBLUE+"===================================================================================="+CEND)
    getHelp()
    quit()


#===========================================================
# MAIN APPLICATION
#===========================================================
print(CGREEN,'Starting server', host, 'on port', port, 'device:', CYELLOW+device, CEND)

translator = ctranslate2.Translator("fairseq/ct2_model/", device=device, intra_threads=intra_threads, inter_threads=inter_threads)

def tokenizeBatch(text, sp_source_model):
    sp = spm.SentencePieceProcessor(sp_source_model)
    if isinstance(text, list):
        return sp.encode(text, out_type=str)
    else:
        return [sp.encode(text, out_type=str)]


def detokenizeBatch(text, sp_target_model):
    sp = spm.SentencePieceProcessor(sp_target_model)
    translation = sp.decode(text)
    return translation
        
app = Flask(__name__)

cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

@app.route("/", methods = ['POST','GET'])
@cross_origin()

def sendSugoi():
    tic = time.perf_counter()
    data = request.get_json(True)
    message = data.get("message")
    content = data.get("content")

    if (message == "close server"):
        shutdown_server()
        return

    if (message == "translate sentences"):
        textlist = []
        print(CGREY)
        if not silent: print(CBEIGE+"Incoming text:"+CGREY, content)
        translated = translator.translate_batch(
            source=tokenizeBatch(content, sp_source_model), 
            normalize_scores=True,
            allow_early_exit=False, 
            beam_size=beam_size, 
            num_hypotheses=1, 
            return_alternatives=False, 
            disable_unk=disable_unk, 
            replace_unknowns=True, 
            repetition_penalty=repetition_penalty
        )
        #translated = translator.translate_batch(source=tokenizeBatch(content, sp_source_model), normalize_scores=True, allow_early_exit=False, beam_size=beam_size, num_hypotheses=1, return_alternatives=False, disable_unk=False, replace_unknowns=False, repetition_penalty=repetition_penalty)
        finalResult = detokenizeBatch([ff[0]["tokens"] for ff in translated], sp_target_model)
        if not silent: print(CBEIGE+"Translated:"+CGREY, finalResult)
        print(CEND)
        return json.dumps(finalResult)

def shutdown_server():
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        raise RuntimeError('Not running with the Werkzeug Server')
    func()

if __name__ == "__main__":
    app.run(host=host, port=port)