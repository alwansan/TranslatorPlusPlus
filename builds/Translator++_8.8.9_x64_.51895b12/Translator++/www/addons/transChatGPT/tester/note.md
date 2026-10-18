
Request:
```
var resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
        "Authorization": "Bearer ...",
        "Content-Type": "application/json"
    },
    redirect: "follow",
    body: JSON.stringify({
         "model": "gpt-3.5-turbo",
         "messages": [{"role": "user", "content": "What is the OpenAI mission?"}] 
         })
});
console.log(await resp.json());
```
Response:
```
{
    "id": "chatcmpl-6pnMWomgxAKkwzzZAjMf6xfJj1GN8",
    "object": "chat.completion",
    "created": 1677802496,
    "model": "gpt-3.5-turbo-0301",
    "usage": {
        "prompt_tokens": 14,
        "completion_tokens": 102,
        "total_tokens": 116
    },
    "choices": [
        {
            "message": {
                "role": "assistant",
                "content": "\n\nThe mission of OpenAI is to create and promote friendly AI for the betterment of humanity as a whole. OpenAI aims to develop highly intelligent systems that can work collaboratively with humans to solve the world's most pressing problems. This includes developing advanced AI technologies that can be used to improve healthcare, education, transportation, and many other areas of human life. The ultimate goal of OpenAI is to create a brighter future for everyone by harnessing the power of AI in a responsible and ethical way."
            },
            "finish_reason": "stop",
            "index": 0
        }
    ]
}
```