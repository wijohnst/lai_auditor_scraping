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
  // from the DOM, the structure of a <tr> element from a table element looks like this:
  // <tr>
  //    <td className='DataletSideHeading'></td>    => this is what's in titles variable below
  //    <td></td>                                   => this will be the nextElementSibling of every title elements in titles array
  // </tr>
  const resultObj = await page.$$eval('.DataletSideHeading', (titles) => {
    // find all the elements with a className of 'DataletSideHeading'...
    // ... loop through to add the key/value pair into the resultsArray
    const reducedResult = titles.reduce((result, td, index, arr) => {
      // reduce method takes up to 4 arguments: previousValue, currentValue, currentIndex, originalArray
      if (td.textContent === '\u00a0' || td.textContent === '') {
        // if the value of the first <td> under a <tr> is empty and has a non-breaking space('\u00a0' is the unicode character for '&nbsp')...
        // ...the value for the second <td> should be concatinated into one single column to match the <td> of the last <tr>
        result[Object.keys(result).pop()] =
          result[Object.keys(result).pop()] +
          ' ' +
          td.nextElementSibling.textContent
            .replace('\u00a0', ' ')
            .trim()
            .replace('Submit Mailing Address Correction Request', '')
            .replace('Submit Site Address Correction Request', '');
      } else if (index > 0 && arr[index - 1].textContent.endsWith('/')) {
        // This is specifically for Owner Mailing/Contact Address. They are rendered as two rows but it makes more sense ...
        // ...if they are one column and the column name should be combining the current textContent and the next one
        const lastKey = Object.keys(result).pop(); // Find the value of last key/value pair
        const lastValue = result[lastKey]; // Find the value of last key/value pair
        const currentKey = lastKey + ' ' + td.textContent; // Concatenate the last <td> textContent that ends with '/' and the next <td> textContent
        const currentValue = lastValue + td.nextElementSibling.textContent; // The same with last step but with the sibling <td> of the target <td>
        delete result[lastKey];
        result[currentKey] = currentValue;
      } else {
        result[td.textContent] =
          td.nextElementSibling.textContent === '\u00a0'
            ? null
            : td.nextElementSibling.textContent.replace(
                'Sign Up for or Manage Property eAlerts',
                ''
              );
      }
      return result;
    }, {});
    return reducedResult;
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
