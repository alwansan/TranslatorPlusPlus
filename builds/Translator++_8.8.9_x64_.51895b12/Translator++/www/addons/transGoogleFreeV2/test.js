async function makeTranslateRequest() {
  const url = 'https://translate.google.com/_/TranslateWebserverUi/data/batchexecute?rpcids=MkEWBc&source-path=%2F&f.sid=6705977412377981885&bl=boq_translate-webserver_20231213.02_p0&hl=en&soc-app=1&soc-platform=1&soc-device=1&_reqid=29150&rt=c';

  const postData = 'f.req=%5B%5B%5B%22MkEWBc%22%2C%22%5B%5B%5C%22hello%20what%20are%20you%20doing?%5C%22%2C%5C%22en%5C%22%2C%5C%22id%5C%22%2C1%5D%2C%5B%5D%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&at=AFS6QyiUsza3LGWdqK7CPpeTshwi%3A1702595149082&';

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
makeTranslateRequest();