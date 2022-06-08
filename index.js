const express = require("express");
const app = express();
const port = 6666;

const puppeteer = require("puppeteer");

const parseAddresses = require('./addressParser');

const url = "https://property.franklincountyauditor.com/_web/search/commonsearch.aspx?mode=address";
const addresses = parseAddresses();

async function configureTheBrowser(){
	// const browswer = await puppeteer.launch();
	const browswer = await puppeteer.launch({ headless: false});
	const page = await browswer.newPage();
	await page.goto(url, { waitUntil: "load", timeout: 0});
	return page;
}

async function searchForAddress(page, streetNumber){
	console.log("Searching for address...")
	if(streetNumber){
		console.log(String(streetNumber))
		await page.waitForSelector('input[name=inpNumber]');
		await page.$eval('input[name=inpNumber]',element => element.value = String(streetNumber))
		await page.$eval('input[name=inpStreet]', element => element.value = "Livingston" )
		await page.$eval('button[name=btSearch]', element => element.click())
	}
}

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, async () => {
  console.log(`Example app listening at http://localhost:${port}`);
	let page = await configureTheBrowser();
	await searchForAddress(page, addresses[0]);
});

