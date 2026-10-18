import getopt, sys, os, json, signal

from flask import Flask
from flask import request
from flask_cors import CORS, cross_origin

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


# Remove 1st argument from the
# list of command line arguments
argumentList = sys.argv[1:]
 
# Options
options = "hsgn:p:"
 
# Long options
long_options = ["help", "silent", "gpu", "host =", "port ="]
status = "ready"

def translate(translator, text):
    result = translator.translate(text)
    return result

def file_len(fname):
    if not os.path.isfile(fname):
        return 0
    with open(fname) as f:
        for i, l in enumerate(f):
            pass
    return i + 1

# source is accessible file from server
def batchTranslate(translator, source):
    if not os.path.isfile(source):
        print("Error! File", source, "is not exist!")
        return

    temp = source + ".res~"
    result = source + ".res"

    def complete():
        print("Batch complete! Result is:", result)
        return result

    if os.path.isfile(result):
        return complete()

    currentProgress = 0
    existingProgress = file_len(temp)
    tempFile  = open(temp, 'a', encoding="UTF-8")

    print("Existing progress is", existingProgress)
    with open(source, encoding="UTF-8") as infile:
        for line in infile:
            if (currentProgress < existingProgress):
                currentProgress += 1
                continue

            #print(line)
            thisObj = json.loads(line)
            print("Job",currentProgress, "translating:", thisObj["text"])
            thisObj["text"] = translate(translator, thisObj["text"])
            tempFile.write(json.dumps(thisObj)+"\n")
            currentProgress += 1
    tempFile.close()
    os.rename(temp, result)
    return complete()


def runService(host, port, gpu, silent):
    from fairseq.models.transformer import TransformerModel
    ja2en = TransformerModel.from_pretrained(
        './japaneseModel/',
        checkpoint_file='big.pretrain.pt',
        source_lang = "ja",
        target_lang = "en",
        bpe='sentencepiece',
        sentencepiece_model='./spmModels/spm.ja.nopretok.model',
        no_repeat_ngram_size=3
        # replace_unk=True
        # is_gpu=True
    )
    if gpu:
        ja2en.cuda()

    app = Flask(__name__)
    cors = CORS(app)
    app.config['CORS_HEADERS'] = 'Content-Type'
    @app.route("/", methods = ['POST'])
    @cross_origin()

    def sendImage():
        data = request.get_json()
        
        message = data.get("message")
        content = data.get("content")

        if (message == "translate sentences"):
            print(CGREY)
            if not silent: print(CBEIGE+"Incoming text:"+CGREY, content)
            finalResult = json.dumps(translate(ja2en, content))
            if not silent: print(CBEIGE+"Translated:"+CGREY, finalResult)
            print(CEND)
            return finalResult

        if (message == "batch"):
            result = batchTranslate(ja2en, content)
            return json.dumps(result)

        if (message == "status"):
            return json.dumps(status)

        if (message == "close server"):
            #shutdown_server()
            print("Received a request to shut down the server.")
            print("SHUTING DOWN SERVER!")
            os.kill(os.getpid(), signal.SIGINT)


    app.run(host=host, port=port)
    print("Server is running")


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

    -s / --silent
        Suppress message.

Example:
    py startServer.py -s 127.0.0.1 -p 27027
    ''')


def init():
    silent=False
    port=14377
    host='0.0.0.0'
    gpu=False
    print(CYELLOW+"Fairseq"+CEND+" with Sugoi Translator's pre-trained model. Flask server mod for Translator++")
    print("Use arg -h to display the help menu")
    print(CBLUE+"===================================================================================="+CEND)
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

    except getopt.error as err:
        # output error, and return with an error code
        print (str(err))

    processor = CYELLOW+"NO"+CEND
    if gpu: processor = CGREEN+"YES"+CEND

    print(CBEIGE,'Starting server',CYELLOW, host, CBEIGE, 'on port', CYELLOW, port, CBEIGE, 'use GPU:', processor, CEND)
    runService(host, port, gpu, silent)


if __name__ == "__main__":
    init()