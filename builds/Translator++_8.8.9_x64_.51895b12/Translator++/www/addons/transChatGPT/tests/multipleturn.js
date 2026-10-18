(async ()=>{
    async function translateJapaneseToEnglish(originalText, apiKey) {
        const url = 'https://api.openai.com/v1/chat/completions';
    
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };
    
        const body = JSON.stringify({
            model: "gpt-4",  // You can specify the model version you are using
            messages: [
                { role: "system", content: "You are a translator that translates Japanese text to English." },
                { role: "user", content: `Translate the following text from Japanese to English: こんにちは、元気ですか？` },
                { role: "assistant", content: `Hello, how are you?` },
                { role: "user", content: `Perfect! now this: ${originalText}` },

            ],
            max_tokens: 1000  // Adjust the max tokens as needed
        });
    
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: body
            });
    
            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }
    
            const data = await response.json();
            const translatedText = data.choices[0].message.content;
            return translatedText;
        } catch (error) {
            console.error('Error translating text:', error);
        }
    }
    
    // Example usage:
    const apiKey = TranslatorEngine.getEngine("chatGPT").apiKey;
    const japaneseText = '中国史に於ける貴族とは、魏晋南北朝時代から唐末期';
    
    translateJapaneseToEnglish(japaneseText, apiKey)
        .then(translatedText => console.log('Translated text:', translatedText))
        .catch(error => console.error('Error:', error));
    })()