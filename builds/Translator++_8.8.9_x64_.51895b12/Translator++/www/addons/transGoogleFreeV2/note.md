## How it works
```JS
function makePayload(text, sl, tl) {
    return JSON.stringify(
        [[
            [
                "MkEWBc",
                JSON.stringify([[text||"",sl,tl,1],[]])
            ]
        ]]
    )
}

function objectToUrlEncoded(obj) {
  return Object.entries(obj)
    .filter(([key, value]) => key !== '' && value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

async function makeTranslateRequest(obj) {
  const url = 'https://translate.google.com/_/TranslateWebserverUi/data/batchexecute?rpcids=MkEWBc&source-path=%2F&f.sid=-4108363695877732010&bl=boq_translate-webserver_20231213.02_p0&hl=en&soc-app=1&soc-platform=1&soc-device=1&_reqid=83348&rt=c';

  const postData = objectToUrlEncoded(obj);

  const headers = new Headers();
  headers.append('Accept', '*/*');
  headers.append('Accept-Encoding', 'gzip, deflate, br');
  headers.append('Accept-Language', 'en-US,en;q=0.9');
  headers.append('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
  headers.append('Content-Length', postData.length.toString());
  headers.append('Origin', 'https://translate.google.com');
  headers.append('Referer', 'https://translate.google.com/');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: postData,
    });

    const data = await response.text();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Call the async function
await makeTranslateRequest({
    "f.req": "[[[\"MkEWBc\",\"[[\\\"hello world\\\",\\\"en\\\",\\\"ja\\\",1],[]]\",null,\"generic\"]]]",
    "at": "AFS6QyjC-JBTQvuiyRLIEqn9wIVQ:1702649346622"
})
```

The post data consists of `f.req` and `at` parameter.
`f.req` hold the information we need to send to google end point (i.e translations) and `at` holds the token to validate the request.
We can send whatever the contents as long as the `at` value is valid.

### IDEA
1. Send a random translation request to google: 
`https://translate.google.com/?sl=en&tl=id&text=hello%20world&op=translate`

2. Intercept the request, and capture the `at` value
3. Send the rest of the texts using the capture `at` value