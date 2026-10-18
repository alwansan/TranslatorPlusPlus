from google_trans_new import google_translator  
  
translator = google_translator(url_suffix="com") 
translate_text = translator.translate('สวัสดีจีน',lang_tgt='en')  
print(translate_text)
