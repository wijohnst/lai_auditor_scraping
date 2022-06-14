const fastcsv = require('fast-csv');
const fs = require('fs');
const ws = fs.createWriteStream('livingstonProperties.csv');
const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = 6666;
const parseAddresses = require('./addressParser');

let resultsArray = [];

const url =
  'https://property.franklincountyauditor.com/_web/search/commonsearch.aspx?mode=address';
const addresses = parseAddresses();

async function searchForAddress(page, streetNumber) {
  if (streetNumber) {
    await page.waitForSelector('#inpNumber');
    await page.type('#inpNumber', String(streetNumber));
    await page.waitForSelector('#inpStreet');
    await page.type('#inpStreet', 'Livingston');
    await Promise.all([
      page.waitForNavigation(),
      page.$eval('button[name=btSearch]', (element) => element.click()),
    ]);

    await scrapeData(page);

    await page.close();
  }
}

async function scrapeData(page) {
  // Find all the elements with a className of 'DataletSideHeading'...
  // ... loop through to add the key/value pair into the resultsArray
  const resultObj = await page.$$eval('.DataletSideHeading', (titles) => {
    let result = {};
    for (let i = 0; i < titles.length; i++) {
      // If the value of the first <td> under a <tr> is empty and has a non-breaking space('\u00a0' is the unicode character for '&nbsp')...
      // ...the value for the second <td> should be concatinated into one single column to match the <td> of the last <tr>
      if (titles[i].textContent === '\u00a0' || titles[i].textContent === '') {
        result[Object.keys(result).pop()] =
          Object.values(result).pop().replace('\u00a0', '').trim() +
          ' ' +
          titles[i].nextElementSibling.textContent
            .replace('\u00a0', '')
            .trim()
            .replace('Submit Mailing Address Correction Request', '')
            .replace('Submit Site Address Correction Request', '');
      } else if (titles[i].textContent.endsWith('/')) {
        // This is specifically for Owner Mailing/Contact Address. They are rendered as two rows but it makes more sense ...
        // ...if they are one column and the column name should be combining the current textContent and the next one...
        // ... we need to flag the next textContent by giving it an empty value so the next iteration will run it through the first scenario of If statement
        titles[i].textContent += titles[i + 1].textContent;
        titles[i + 1].textContent = '';
        result[titles[i].textContent] =
          titles[i].nextElementSibling.textContent;
      } else {
        result[titles[i].textContent] =
          titles[i].nextElementSibling.textContent === '\u00a0'
            ? null
            : titles[i].nextElementSibling.textContent;
      }
    }
    return result;
  });
  resultsArray.push(resultObj);
}

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.listen(port, async () => {
  console.log(`Example app listening at http://localhost:${port}`);

  if (addresses) {
    const browswer = await puppeteer.launch({ headless: false });
    for (const address of addresses) {
      const page = await browswer.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(url, { waitUntil: 'load', timeout: 0 });

      await searchForAddress(page, address);
    }
    await browswer.close();
  }
  fastcsv.write(resultsArray, { headers: true }).pipe(ws);
});
